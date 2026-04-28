/**
 * Cleanup Job: Purge media for long-expired users
 * 
 * Logic:
 * 1. Find subscriptions expired for more than 30 days.
 * 2. Find all media associated with these users' stores.
 * 3. Delete files from Bunny.net.
 * 4. Update database to mark cleanup as complete.
 */

import mysql from 'mysql2/promise'
import { batchDeleteFromBunny } from '../lib/bunny-cdn'

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || "CHhg(&*865cc",
  database: process.env.DB_NAME || 'store_db',
}

async function cleanup() {
  console.log('🧹 Starting cleanup job for expired users...')
  const connection = await mysql.createConnection(DB_CONFIG)

  try {
    // 1. Find users with subscriptions expired for > 30 days
    const [expiredSubs] = await connection.execute(`
      SELECT s.user_id, s.id as sub_id
      FROM subscriptions s
      WHERE s.status = 'expired' 
      AND s.current_period_end < DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND s.cleanup_at IS NULL
    `)

    const subs = expiredSubs as any[]
    console.log(`Found ${subs.length} subscriptions requiring media cleanup.`)

    for (const sub of subs) {
      console.log(`Processing cleanup for User ID: ${sub.user_id}`)

      // 2. Find all media paths for this user's stores
      const [mediaEntries] = await connection.execute(`
        SELECT m.id, m.path 
        FROM media m
        JOIN products p ON m.product_id = p.id
        JOIN stores s ON p.store_id = s.id
        WHERE s.user_id = ?
      `, [sub.user_id])

      const paths = (mediaEntries as any[]).map(m => m.path)

      if (paths.length > 0) {
        console.log(`Deleting ${paths.length} files from Bunny.net...`)
        const result = await batchDeleteFromBunny(paths)
        console.log(`Deleted: ${result.deleted}, Failed: ${result.failed}`)

        // Delete from DB media table
        await connection.execute('DELETE FROM media WHERE id IN (?)', [(mediaEntries as any[]).map(m => m.id)])
      }

      // 3. Mark subscription as cleaned up
      await connection.execute(
        'UPDATE subscriptions SET cleanup_at = NOW() WHERE id = ?',
        [sub.sub_id]
      )
      console.log(`✅ Cleanup complete for User ID: ${sub.user_id}`)
    }

    console.log('🎉 All cleanup tasks completed.')

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await connection.end()
  }
}

// In a real system, this would be triggered by a Cron job or the lib/queue.ts
cleanup()
