import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)

function assertCronAccess(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET

  if (!secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        success: false,
        code: 'CRON_SECRET_MISSING',
        message: 'CRON_SECRET must be configured before cron endpoints can run.',
      },
      { status: 503 }
    )
  }

  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json(
      {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized.',
      },
      { status: 401 }
    )
  }

  return null
}

export async function POST(request: NextRequest) {
  const denied = assertCronAccess(request)
  if (denied) return denied

  try {
    const { stdout, stderr } = await execFileAsync(
      'php',
      ['artisan', 'queue:work', '--once', '--stop-when-empty', '--tries=3', '--timeout=55'],
      {
        cwd: '/var/www/store/backend',
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Worker cycle completed.',
      output: stdout.trim().slice(-4000),
      warnings: stderr.trim().slice(-4000),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker cycle failed.'

    return NextResponse.json(
      {
        success: false,
        code: 'WORKER_FAILED',
        message,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const denied = assertCronAccess(request)
  if (denied) return denied

  return NextResponse.json({
    success: true,
    service: 'queue-worker-cron',
    timestamp: new Date().toISOString(),
  })
}
