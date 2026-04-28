import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse, paginatedResponse } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    let sql = 'SELECT * FROM product_types WHERE deleted_at IS NULL'
    const params: any[] = []

    if (payload.role !== 'admin') {
      sql += ' AND (store_id IN (SELECT id FROM stores WHERE user_id = ?) OR store_id IS NULL)'
      params.push(payload.userId)
    }

    const types = await query<any>(sql, params)
    
    const mapped = types.map((t: any) => ({
      id: String(t.id),
      storeId: String(t.store_id),
      name: t.name,
      nameAr: t.name_ar || t.name,
      slug: t.slug,
      customFields: typeof t.schema === 'string' ? JSON.parse(t.schema) : (t.schema || []),
      createdAt: t.created_at
    }))

    return NextResponse.json(successResponse(mapped))
  } catch (error) {
    console.error('[ProductTypes] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const body = await request.json()
    const { storeId, name, nameAr, slug, customFields } = body

    if (!name || (!storeId && payload.role !== 'admin')) {
      return NextResponse.json(errorResponse('Missing required fields'), { status: 400 })
    }

    // Verify ownership if storeId is provided
    if (storeId) {
      const store = await query('SELECT id FROM stores WHERE id = ? AND user_id = ?', [storeId, payload.userId])
      if (payload.role !== 'admin' && store.length === 0) {
        return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
      }
    }

    const res = await execute(
      'INSERT INTO product_types (store_id, name, name_ar, slug, `schema`, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [storeId, name, nameAr || name, slug || name.toLowerCase().replace(/\s+/g, '-'), JSON.stringify(customFields || [])]
    )

    return NextResponse.json(successResponse({ id: res }, 'Product type created successfully'))
  } catch (error) {
    console.error('[ProductTypes] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
