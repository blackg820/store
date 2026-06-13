import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function internalApiUrl(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_INTERNAL_API_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '')
}

export async function GET() {
  const started = Date.now()

  try {
    const response = await fetch(`${internalApiUrl()}/api/v1/ops/health/deep`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    })
    const payload = await response.json().catch(() => null)

    return NextResponse.json(
      {
        success: response.ok,
        status: response.ok ? 'ok' : 'degraded',
        latencyMs: Date.now() - started,
        backend: payload,
        checks: {
          next: {
            status: 'healthy',
            uptimeSeconds: Math.round(process.uptime()),
          },
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: response.ok ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: 'degraded',
        latencyMs: Date.now() - started,
        checks: {
          next: {
            status: 'healthy',
            uptimeSeconds: Math.round(process.uptime()),
          },
          backend: {
            status: 'unhealthy',
          },
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
