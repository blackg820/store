import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader, errorResponse } from '@/lib/jwt'
import { getTranslations } from '@/lib/i18n-server'

export async function POST(request: NextRequest) {
  try {
    const { t } = getTranslations(request)
    const tokenHeader = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!tokenHeader) {
      return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })
    }

    const payload = await verifyToken(tokenHeader)
    if (!payload || payload.type !== 'access') {
      return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })
    }

    if (payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Unauthorized. Admin role required.'), { status: 403 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    
    if (!botToken) {
      return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not configured in .env' }, { status: 400 })
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook`
    
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    })

    const data = await res.json()

    if (data.ok) {
      return NextResponse.json({ success: true, description: data.description })
    } else {
      return NextResponse.json({ success: false, error: data.description || 'Failed to set webhook' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Telegram Setup] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
