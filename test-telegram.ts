import { sendTelegramNotificationNow } from './lib/telegram-worker'
import { queryOne } from './lib/db'
import dotenv from 'dotenv'

dotenv.config()

async function test() {
  const res = await sendTelegramNotificationNow('6', 'Test notification from script!')
  console.log('Result:', res)
  process.exit(0)
}

test()
