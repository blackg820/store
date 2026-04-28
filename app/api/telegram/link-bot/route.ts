import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, errorResponse } from '@/lib/jwt'
import { getTranslations } from '@/lib/i18n-server'
import crypto from 'crypto'

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

    const { storeId, type } = await request.json()

    if (!storeId || !type) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
    }

    // Verify ownership
    if (payload.role !== 'admin') {
      const store = await queryOne('SELECT id FROM stores WHERE id = ? AND user_id = ?', [storeId, payload.userId])
      if (!store) {
        return NextResponse.json({ success: false, error: 'Unauthorized. You do not own this store.' }, { status: 403 })
      }
    }

    // Generate a unique token
    const token = crypto.randomBytes(12).toString('hex')
    const id = crypto.randomUUID()
    
    // Expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await execute(
      'INSERT INTO telegram_links (id, store_id, type, token, expires_at) VALUES (?, ?, ?, ?, ?)',
      [id, storeId, type, token, expiresAt]
    )

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'StorifyBot'
    const deeplink = `https://t.me/${botUsername}?start=${token}`

    return NextResponse.json({ success: true, deeplink })
  } catch (error) {
    console.error('[Telegram Link Bot] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
