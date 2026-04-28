import { enqueue } from './queue'
import { sendTelegramNotificationNow } from './telegram-worker'

export async function sendTelegramNotification(storeId: string, message: string, event?: string, context?: { orderGroupId?: string; orderId?: string }) {
  try {
    const success = await enqueue({
      type: 'telegram_notification',
      data: { storeId, message, event, context }
    })
    if (!success) {
      console.warn('[Telegram Queue] Enqueue returned false, falling back to direct send.')
      return await sendTelegramNotificationNow(storeId, message, event, context)
    }
    return true
  } catch (error) {
    console.error('[Telegram Queue] Error enqueuing notification, executing direct fallback:', error)
    return await sendTelegramNotificationNow(storeId, message, event, context)
  }
}

/** @deprecated Use sendTelegramNotification instead */
export async function sendTelegramMessage({ storeId, message }: { storeId: string; message: string; chatId?: string }) {
  return sendTelegramNotification(storeId, message)
}

export function isTelegramConfigured() {
  return !!process.env.TELEGRAM_BOT_TOKEN
}

export async function broadcastToAllStores(message: string) {
  try {
    await enqueue({
      type: 'broadcast_message',
      data: { message }
    })
    return true
  } catch (error) {
    console.error('[Telegram Queue] Error enqueuing broadcast:', error)
    return false
  }
}
