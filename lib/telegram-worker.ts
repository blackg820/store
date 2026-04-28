import { queryOne } from './db'
import { getServerTranslations } from './i18n-server'

export async function sendTelegramNotificationNow(storeId: string, message: string, event?: string, context?: { orderGroupId?: string; orderId?: string }) {
  const { t } = getServerTranslations('ar')

  try {
    const store = await queryOne<{ 
      telegram_token: string; 
      telegram_user_id: string; 
      telegram_group_id: string;
      telegram_chat_id: string;
      whatsapp_number: string;
      notification_settings: string | null;
    }>(
      'SELECT telegram_token, telegram_user_id, telegram_group_id, telegram_chat_id, whatsapp_number, notification_settings FROM stores WHERE id = ?',
      [storeId]
    )

    if (!store) return false

    // Parse settings
    let method = 'telegram'
    let eventEnabled = true
    if (store.notification_settings) {
      try {
        const settings = typeof store.notification_settings === 'string' ? JSON.parse(store.notification_settings) : (store.notification_settings || {})
        if (event && settings[event] === false) eventEnabled = false
        if (settings.notificationMethod) method = settings.notificationMethod
      } catch (e) {}
    }

    if (!eventEnabled) {
      console.log(`[Notification Worker] Event ${event} is disabled for store ${storeId}`)
      return true
    }

    let telegramSuccess = true
    let whatsappSuccess = true

    // Send Telegram if needed
    if (method === 'telegram' || method === 'both') {
      const token = store.telegram_token || process.env.TELEGRAM_BOT_TOKEN
      const chatIds = [store.telegram_user_id, store.telegram_group_id, store.telegram_chat_id].filter(Boolean)

      if (token && chatIds.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://store.blackt.uk'
        const manageUrl = `${appUrl}/dashboard/orders?search=${context?.orderGroupId}`
        
        const inline_keyboard = []
        
        if (context?.orderGroupId) {
          inline_keyboard.push([{ 
            text: t('manageOrder'), 
            url: manageUrl
          }])
          
          if (event === 'newOrders' && context.orderId) {
            inline_keyboard.push([
              { text: '✅ ' + (t('confirm' as any) || 'Confirm'), callback_data: `status:confirmed:${context.orderId}` },
              { text: '📦 ' + (t('delivered' as any) || 'Delivered'), callback_data: `status:delivered:${context.orderId}` }
            ])
            inline_keyboard.push([
              { text: '⚠️ ' + (t('problematic' as any) || 'Problematic'), callback_data: `status:problematic:${context.orderId}` }
            ])
          }
        }

        const buttons = inline_keyboard.length > 0 ? { inline_keyboard } : undefined

        const telegramResults = await Promise.all(
          chatIds.map(async (chatId) => {
            try {
              const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: message.replace(/<br\/>/g, '\n'),
                  parse_mode: 'HTML',
                  reply_markup: buttons
                })
              })
              
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                console.error(`[Telegram Worker] Failed to send to ${chatId}:`, errData)
              }
              
              return res.ok
            } catch (e) { 
              console.error(`[Telegram Worker] Network error for ${chatId}:`, e)
              return false 
            }
          })
        )
        telegramSuccess = telegramResults.some(r => r)
      } else if (method === 'telegram' || method === 'both') {
        console.warn(`[Telegram Worker] Telegram enabled but no token/chatIds for store ${storeId}`)
        telegramSuccess = false
      }
    }

    // Send WhatsApp if needed
    if ((method === 'whatsapp' || method === 'both') && store.whatsapp_number) {
      console.log(`[Notification Worker] Sending WhatsApp to ${store.whatsapp_number}: ${message}`)
      whatsappSuccess = true 
    }

    return telegramSuccess && whatsappSuccess
  } catch (error) {
    console.error('[Telegram Worker] Error:', error)
    return false
  }
}

export async function broadcastToAllStoresNow(message: string) {
  try {
    const stores = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v1/stores`).then(r => r.json())
    if (!stores.success) return false

    for (const store of stores.data) {
      await sendTelegramNotificationNow(store.id, `<b>📢 BROADCAST</b>\n\n${message}`)
    }
    return true
  } catch (error) {
    console.error('[Telegram Worker] Broadcast error:', error)
    return false
  }
}
