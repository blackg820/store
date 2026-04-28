import { insert, execute, query } from '@/lib/db'
import { sendTelegramNotificationNow, broadcastToAllStoresNow } from '@/lib/telegram-worker'

export type JobType = 'telegram_notification' | 'broadcast_message' | 'cleanup_task'

export interface JobPayload {
  type: JobType
  data: any
  attempts?: number
  maxAttempts?: number
}

export async function enqueue(payload: JobPayload) {
  const { type, data, maxAttempts = 3 } = payload
  
  return await insert(
    `INSERT INTO jobs (queue, payload, attempts, reserved_at, available_at, created_at)
     VALUES (?, ?, 0, NULL, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
    ['default', JSON.stringify({ type, data, maxAttempts })]
  )
}

export async function processJobs() {
  const now = Math.floor(Date.now() / 1000)
  
  // 1. Reserve jobs
  const jobs = await query<any>(
    `SELECT * FROM jobs 
     WHERE (reserved_at IS NULL OR reserved_at < ?) 
     AND available_at <= ? 
     ORDER BY created_at ASC LIMIT 10`,
    [now - 300, now] // Re-try jobs reserved more than 5 mins ago
  )

  if (jobs.length === 0) return 0

  let processedCount = 0

  for (const job of jobs) {
    // Mark as reserved
    await execute('UPDATE jobs SET reserved_at = ? WHERE id = ?', [now, job.id])
    
    try {
      const payload = JSON.parse(job.payload)
      const success = await handleJob(payload.type, payload.data)
      
      if (success) {
        await execute('DELETE FROM jobs WHERE id = ?', [job.id])
        processedCount++
      } else {
        await handleFailure(job)
      }
    } catch (error) {
      console.error(`[Queue] Failed to process job ${job.id}:`, error)
      await handleFailure(job)
    }
  }

  return processedCount
}


async function handleJob(type: JobType, data: any): Promise<boolean> {
  console.log(`[Queue] Handling job: ${type}`, data)
  
  switch (type) {
    case 'telegram_notification':
      return await sendTelegramNotificationNow(data.storeId, data.message, data.event, data.context)
    
    case 'broadcast_message':
      return await broadcastToAllStoresNow(data.message)
      
    default:
      return false
  }
}

async function handleFailure(job: any) {
  const payload = JSON.parse(job.payload)
  const newAttempts = job.attempts + 1
  
  if (newAttempts >= (payload.maxAttempts || 3)) {
    // Move to failed_jobs
    await insert(
      'INSERT INTO failed_jobs (uuid, connection, queue, payload, exception, failed_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [crypto.randomUUID(), 'mysql', 'default', job.payload, 'Max attempts reached']
    )
    await execute('DELETE FROM jobs WHERE id = ?', [job.id])
  } else {
    // Increment attempts and un-reserve
    await execute(
      'UPDATE jobs SET attempts = ?, reserved_at = NULL, available_at = UNIX_TIMESTAMP() + ? WHERE id = ?',
      [newAttempts, Math.pow(2, newAttempts) * 60, job.id] // Exponential backoff
    )
  }
}
