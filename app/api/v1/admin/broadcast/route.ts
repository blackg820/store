import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'
import { broadcastToAllStores } from '@/lib/telegram'
import { insert } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Access denied'), { status: 403 })
    }

    const { title, message } = await request.json()

    if (!message) {
      return NextResponse.json(errorResponse('Message is required'), { status: 400 })
    }

    // 1. Log the notification
    await insert(
      'INSERT INTO global_notifications (title, message, created_at) VALUES (?, ?, NOW())',
      [title || 'Global Announcement', message]
    )

    // 2. Send to all stores via Telegram
    const formattedMessage = `<b>${title || '📢 ANNOUNCEMENT'}</b>\n\n${message}`
    
    // We run this in the background
    broadcastToAllStores(formattedMessage).catch(console.error)

    return NextResponse.json(successResponse(null, 'Broadcast initiated successfully'))
  } catch (error) {
    console.error('[Broadcast] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
