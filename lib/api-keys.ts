import { generateApiKey } from './password'

/**
 * API Key management for store owners (mobile app access).
 * In production, keys are hashed before storage.
 */

export interface ApiKey {
  id: string
  userId: string
  storeId?: string // Optional: scope to specific store
  name: string
  keyPrefix: string // First 12 chars for display (sk_live_xxxx)
  hashedKey: string // Full SHA-256 hash stored in DB
  lastUsedAt?: string
  createdAt: string
  expiresAt?: string
  isActive: boolean
}

/**
 * Hash an API key for secure storage (non-reversible).
 * In production, use SHA-256.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createApiKey(
  userId: string,
  name: string,
  storeId?: string
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const rawKey = generateApiKey()
  const hashedKey = await hashApiKey(rawKey)

  const apiKey: ApiKey = {
    id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    userId,
    storeId,
    name,
    keyPrefix: rawKey.substring(0, 12) + '...',
    hashedKey,
    createdAt: new Date().toISOString(),
    isActive: true,
  }

  return { apiKey, rawKey }
}

/**
 * Verify a raw API key against stored hash.
 */
export async function verifyApiKey(
  rawKey: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashApiKey(rawKey)
  return hash === storedHash
}
