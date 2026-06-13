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

async function runArtisan(args: string[]) {
  const { stdout, stderr } = await execFileAsync('php', ['artisan', ...args], {
    cwd: '/var/www/store/backend',
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  })

  return {
    command: `php artisan ${args.join(' ')}`,
    stdout: stdout.trim().slice(-4000),
    stderr: stderr.trim().slice(-4000),
  }
}

export async function POST(request: NextRequest) {
  const denied = assertCronAccess(request)
  if (denied) return denied

  try {
    const results = []
    results.push(await runArtisan(['sanctum:prune-expired', '--hours=24']))
    results.push(await runArtisan(['queue:prune-failed', '--hours=168']))

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed.',
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cleanup failed.'

    return NextResponse.json(
      {
        success: false,
        code: 'CLEANUP_FAILED',
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
    service: 'cleanup-cron',
    timestamp: new Date().toISOString(),
  })
}
