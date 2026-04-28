/**
 * In-memory rate limiter for API routes.
 * In production, this should be replaced with Redis (Upstash) for distributed enforcement.
 *
 * Usage:
 *   const result = await checkRateLimit(identifier, { max: 60, windowMs: 60_000 })
 *   if (!result.allowed) return new Response('Too Many Requests', { status: 429 })
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  max: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { max: 60, windowMs: 60_000 }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    store.set(identifier, newEntry)
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: newEntry.resetAt,
      limit: config.max,
    }
  }

  entry.count += 1
  const allowed = entry.count <= config.max

  return {
    allowed,
    remaining: Math.max(0, config.max - entry.count),
    resetAt: entry.resetAt,
    limit: config.max,
  }
}

// Cleanup expired entries every 5 minutes (runs only on server)
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * Helper to extract client identifier from request (IP-based)
 */
export function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwardedFor?.split(',')[0].trim() ?? realIp ?? 'anonymous'
}

/**
 * Rate limit configurations per endpoint type
 */
export const RATE_LIMITS = {
  auth: { max: 5, windowMs: 60_000 }, // 5 attempts per minute
  api: { max: 60, windowMs: 60_000 }, // 60 requests per minute
  publicOrder: { max: 10, windowMs: 60_000 }, // 10 orders per minute per IP
  telegram: { max: 30, windowMs: 60_000 },
  export: { max: 3, windowMs: 60_000 }, // 3 exports per minute
} as const
