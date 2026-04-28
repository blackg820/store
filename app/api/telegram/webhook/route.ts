import { NextResponse, type NextRequest } from 'next/server'
import { queryOne, execute } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const callbackQuery = update.callback_query
    const message = update.message
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      console.warn('[Telegram Webhook] TELEGRAM_BOT_TOKEN not set')
      return NextResponse.json({ ok: true })
    }

    // 1. Handle Deeplink /start <token>
    if (message?.text?.startsWith('/start ')) {
      const token = message.text.split(' ')[1]
      const chatId = message.chat.id

      // Find the link request
      const linkRequest = await queryOne<{ store_id: string; type: string }>(
        'SELECT store_id, type FROM telegram_links WHERE token = ? AND is_used = FALSE AND expires_at > NOW()',
        [token]
      )

      if (linkRequest) {
        // Link the store
        // We use telegram_chat_id as a general field, or keep user/group separate
        const updateField = linkRequest.type === 'group' ? 'telegram_group_id' : 'telegram_user_id'
        
        await execute(
          `UPDATE stores SET ${updateField} = ? WHERE id = ?`,
          [chatId.toString(), linkRequest.store_id]
        )

        // Mark token as used
        await execute(
          'UPDATE telegram_links SET is_used = TRUE, used_at = NOW() WHERE token = ?',
          [token]
        )

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ <b>Success!</b>\n\nYour store has been linked to this ${linkRequest.type}.\nYou will now receive notifications here.`,
            parse_mode: 'HTML'
          })
        })
      } else {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `❌ <b>Invalid or expired link.</b>\nPlease generate a new link from your dashboard.`,
            parse_mode: 'HTML'
          })
        })
      }
      return NextResponse.json({ ok: true })
    }

    // 2. Handle Callback Queries (Order Status Updates)
    // Expected format: status:confirmed:ORDER_ID
    if (callbackQuery && callbackQuery.data?.startsWith('status:')) {
      const [_, status, orderId] = callbackQuery.data.split(':')
      
      // Verify order exists
      const order = await queryOne<{ id: string; store_id: string }>(
        'SELECT id, store_id FROM orders WHERE id = ?',
        [orderId]
      )

      if (!order) {
        return NextResponse.json({ ok: true })
      }

      // Update order status
      await execute(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, orderId]
      )

      // Answer callback
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callbackQuery.id, 
          text: `✅ Order updated to ${status}` 
        })
      })

      // Update message text (optional but good for UX)
      if (callbackQuery.message) {
        const statusEmoji = status === 'confirmed' ? '✅' : status === 'delivered' ? '📦' : '⚠️'
        const currentText = callbackQuery.message.text || callbackQuery.message.caption || ''
        const updatedText = `${currentText}\n\n${statusEmoji} <b>Status: ${status.toUpperCase()}</b>`
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            text: updatedText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] } // Remove buttons
          })
        })
      }
      
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', bot: process.env.TELEGRAM_BOT_USERNAME || 'unknown' })
}
