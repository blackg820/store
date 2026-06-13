import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function internalApiUrl(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_INTERNAL_API_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '')
}

async function checkBackend() {
  const started = Date.now()

  try {
    const response = await fetch(`${internalApiUrl()}/up`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    })

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      httpStatus: response.status,
      latencyMs: Date.now() - started,
    }
  } catch {
    return {
      status: 'unhealthy',
      httpStatus: null,
      latencyMs: Date.now() - started,
    }
  }
}

export async function GET() {
  const backend = await checkBackend()
  const healthy = backend.status === 'healthy'

  return NextResponse.json(
    {
      success: healthy,
      status: healthy ? 'ok' : 'degraded',
      checks: {
        next: {
          status: 'healthy',
          uptimeSeconds: Math.round(process.uptime()),
        },
        backend,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
