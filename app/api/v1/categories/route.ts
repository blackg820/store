import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    let sql = 'SELECT * FROM categories WHERE deleted_at IS NULL'
    const params: any[] = []

    if (payload.role !== 'admin') {
      sql += ' AND store_id IN (SELECT id FROM stores WHERE user_id = ?)'
      params.push(payload.userId)
    }

    const categories = await query<any>(sql, params)
    
    const mapped = categories.map((c: any) => ({
      id: String(c.id),
      storeId: String(c.store_id),
      productTypeId: c.product_type_id ? String(c.product_type_id) : null,
      parentId: c.parent_id ? String(c.parent_id) : null,
      name: c.name,
      nameAr: c.name_ar || c.name,
      slug: c.slug,
      isActive: true, // DB missing isActive, default true
      createdAt: c.created_at
    }))

    return NextResponse.json(successResponse(mapped))
  } catch (error) {
    console.error('[Categories] GET error:', error)
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
    const { storeId, productTypeId, parentId, name, nameAr, slug } = body

    if (!storeId || !name) {
      return NextResponse.json(errorResponse('Missing required fields'), { status: 400 })
    }

    // Verify ownership
    const store = await query('SELECT id FROM stores WHERE id = ? AND user_id = ?', [storeId, payload.userId])
    if (payload.role !== 'admin' && store.length === 0) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    const res = await execute(
      'INSERT INTO categories (store_id, product_type_id, parent_id, name, name_ar, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [storeId, productTypeId || null, parentId || null, name, nameAr || name, slug || name.toLowerCase().replace(/\s+/g, '-')]
    )

    return NextResponse.json(successResponse({ id: res }, 'Category created successfully'))
  } catch (error) {
    console.error('[Categories] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
