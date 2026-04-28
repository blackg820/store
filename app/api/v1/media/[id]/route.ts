import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'
import { generateSignedUrl } from '@/lib/bunny-cdn'

// GET /api/v1/media/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const media = await queryOne<Record<string, unknown>>(
      `SELECT m.*, p.store_id FROM media m
       JOIN products p ON m.product_id = p.id
       WHERE m.id = ? AND m.deleted_at IS NULL`, [id]
    )

    if (!media) {
      return NextResponse.json(errorResponse('Media not found'), { status: 404 })
    }

    // Public media — no auth needed
    if (media.visibility === 'public') {
      return NextResponse.json(successResponse({
        id: String(media.id),
        url: media.url,
        type: media.type,
        visibility: media.visibility,
        metadata: media.metadata,
      }))
    }

    // Private/restricted — require auth
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) {
      return NextResponse.json(errorResponse('Authorization required for private media'), { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') {
      return NextResponse.json(errorResponse('Invalid token'), { status: 401 })
    }

    // Check ownership
    const store = await queryOne<{ user_id: number }>(
      'SELECT user_id FROM stores WHERE id = ?', [media.store_id]
    )
    if (payload.role !== 'admin' && store && store.user_id !== payload.userId) {
      return NextResponse.json(errorResponse('Access denied'), { status: 403 })
    }

    return NextResponse.json(successResponse({
      id: String(media.id),
      url: media.url,
      type: media.type,
      visibility: media.visibility,
      metadata: media.metadata,
    }))
  } catch (error) {
    console.error('[Media] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// POST /api/v1/media/[id] — generate signed URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid token'), { status: 401 })

    const { id } = await params

    const media = await queryOne<Record<string, unknown>>(
      'SELECT * FROM media WHERE id = ? AND deleted_at IS NULL', [id]
    )

    if (!media) {
      return NextResponse.json(errorResponse('Media not found'), { status: 404 })
    }

    const signedUrl = generateSignedUrl(String(media.url), 3600)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

    return NextResponse.json(successResponse({ signedUrl, expiresAt }))
  } catch (error) {
    console.error('[Media] Signed URL error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
