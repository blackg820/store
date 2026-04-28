import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      expiredSubscriptions: 0,
      suspendedUsers: 0,
      cleanedSessions: 0,
      cleanedRateLimits: 0,
      timestamp: new Date().toISOString(),
    }

    // 1. Suspend users with expired subscriptions (controlled mode only)
    const suspended = await execute(
      `UPDATE users SET status = 'suspended', updated_at = NOW()
       WHERE mode = 'controlled' AND status = 'active'
       AND subscription_plan IS NOT NULL
       AND id NOT IN (
         SELECT DISTINCT user_id FROM stores WHERE deleted_at IS NULL
       )
       AND updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    )
    results.suspendedUsers = suspended

    // 2. Clean up old sessions
    const sessions = await execute(
      'DELETE FROM sessions WHERE last_activity < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY))'
    )
    results.cleanedSessions = sessions

    // 3. Clean up expired personal access tokens
    await execute(
      'DELETE FROM personal_access_tokens WHERE expires_at IS NOT NULL AND expires_at < NOW()'
    )

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      results,
    })
  } catch (error) {
    console.error('[Cron] Cleanup error:', error)
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cleanup-cron',
    timestamp: new Date().toISOString(),
  })
}
