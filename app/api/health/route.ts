import { NextResponse } from 'next/server'
import { checkConnection } from '@/lib/db'
import { isBunnyConfigured } from '@/lib/bunny-cdn'
import { isTelegramConfigured } from '@/lib/telegram'

/**
 * Health check endpoint for monitoring and uptime checks.
 */
export async function GET() {
  const dbHealthy = await checkConnection()

  const checks = {
    api: 'healthy',
    database: dbHealthy ? 'healthy' : 'unhealthy',
    bunny_cdn: isBunnyConfigured() ? 'configured' : 'not-configured',
    telegram: isTelegramConfigured() ? 'configured' : 'not-configured',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }

  const overallStatus = dbHealthy ? 'ok' : 'degraded'

  return NextResponse.json(
    { status: overallStatus, checks },
    {
      status: dbHealthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
