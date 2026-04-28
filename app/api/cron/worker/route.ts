import { NextRequest, NextResponse } from 'next/server'
import { processJobs } from '@/lib/queue'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Simple secret check for basic security
  const authHeader = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET || 'storify_secret_2026'
  
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Worker] Starting job processing...')
    const processed = await processJobs()
    console.log(`[Worker] Processed ${processed} jobs.`)
    return NextResponse.json({ 
      success: true, 
      processed, 
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('[Worker] Error processing jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
