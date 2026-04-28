import { NextResponse, type NextRequest } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { getServerTranslations } from '@/lib/i18n-server'

/**
 * Telegram Bot Webhook Handler
 * Uses grammy style logic (lightweight fetch) to handle multi-tenant bots.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { t } = getServerTranslations('ar') 

  try {
    const update = await req.json()
    const callbackQuery = update.callback_query
    const message = update.message

    // Get the store's telegram token
    const store = await queryOne<{ telegram_token: string }>(
      'SELECT telegram_token FROM stores WHERE id = ?',
      [id]
    )
    const botToken = store?.telegram_token || process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) return NextResponse.json({ ok: true })

    // 1. Handle Callback Queries (Order Buttons)
    if (callbackQuery && callbackQuery.data?.startsWith('status:')) {
      const [_, status, groupId] = callbackQuery.data.split(':')
      
      // Verify order belongs to this store
      const orderInfo = await queryOne<{ id: number }>(
        'SELECT id FROM orders WHERE group_id = ? AND store_id = ? LIMIT 1',
        [groupId, id]
      )

      if (!orderInfo) {
        return NextResponse.json({ ok: true })
      }

      // Update order status
      await execute(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE group_id = ?',
        [status, groupId]
      )

      // Answer callback
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: callbackQuery.id, 
          text: `✅ ${status.toUpperCase()} updated.` 
        })
      })

      // Update message UI
      if (callbackQuery.message) {
        const statusEmoji = status === 'confirmed' ? '✅' : status === 'delivered' ? '📦' : '⚠️'
        const updatedText = (callbackQuery.message.text || '') + `\n\n${statusEmoji} <b>Status: ${status.toUpperCase()}</b>`
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            text: updatedText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] } // Remove buttons after use
          })
        })
      }
      
      return NextResponse.json({ ok: true })
    }

    // 2. Handle Basic Commands
    if (message?.text?.startsWith('/start')) {
      // Basic welcome for the bot
      const chatId = message.chat.id
      // We don't have store context here unless we use linking tokens (skipped for brevity as requested "order buttons")
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active' })
}
