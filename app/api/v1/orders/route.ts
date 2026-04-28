import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, insert } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse, paginatedResponse } from '@/lib/jwt'
import { getTranslations } from '@/lib/i18n-server'

// GET /api/v1/orders
export async function GET(request: NextRequest) {
  try {
    const { t } = getTranslations(request)
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status')
    const buyerId = searchParams.get('buyer_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const offset = (page - 1) * limit

    let where = 'o.deleted_at IS NULL'
    const params: unknown[] = []

    if (payload.role !== 'admin') {
      where += ' AND s.user_id = ?'
      params.push(payload.userId)
    }
    if (storeId) { where += ' AND o.store_id = ?'; params.push(storeId) }
    if (status) { where += ' AND o.status = ?'; params.push(status) }
    if (buyerId) { where += ' AND o.buyer_id = ?'; params.push(buyerId) }
    if (startDate) { where += ' AND o.created_at >= ?'; params.push(startDate) }
    if (endDate) { where += ' AND o.created_at <= ?'; params.push(endDate) }

    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM orders o JOIN stores s ON o.store_id = s.id WHERE ${where}`, params
    )
    const total = countResult[0]?.total || 0

    const orders = await query<any>(
      `SELECT o.*, s.name as store_name, s.slug as store_slug,
              b.name as buyer_name, b.phone as buyer_phone, b.risk_level,
              b.address as buyer_address
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       JOIN buyers b ON o.buyer_id = b.id
       WHERE ${where}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    if (orders.length === 0) {
      return NextResponse.json(paginatedResponse([], page, limit, total))
    }

    // Fetch items for these orders
    const orderIds = orders.map((o: any) => o.id)
    const items = await query<any>(
      `SELECT oi.*, p.title as product_name, p.title_ar as product_name_ar, p.price as current_price
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id IN (${orderIds.join(',')})`
    )

    const mapped = orders.map((o: any) => {
      const orderItems = items.filter((i: any) => i.order_id === o.id).map((i: any) => ({
        id: String(i.id),
        orderId: String(i.order_id),
        productId: String(i.product_id),
        quantity: i.quantity,
        price: Number(i.unit_price),
        product: { title: i.product_name, titleAr: i.product_name_ar, price: Number(i.current_price) } as any,
        options: typeof i.options === 'string' ? ((): any => { try { return JSON.parse(i.options) } catch { return {} } })() : (i.options || {}),
        createdAt: i.created_at
      }))

      return {
        id: String(o.id),
        storeId: String(o.store_id),
        orderGroupId: o.group_id,
        buyerId: String(o.buyer_id),
        totalAmount: Number(o.total_amount),
        deliveryFee: Number(o.delivery_fee || 0),
        status: o.status,
        notes: o.internal_notes || '',
        buyerNotes: o.buyer_notes || '',
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        store: { id: String(o.store_id), name: o.store_name, slug: o.store_slug },
        buyer: { 
          id: String(o.buyer_id), 
          name: o.buyer_name, 
          phone: o.buyer_phone, 
          risk: o.risk_level,
          ...(typeof o.buyer_address === 'string' ? ((): any => {
            try {
              const addr = JSON.parse(o.buyer_address)
              return {
                governorate: addr.governorate,
                district: addr.district,
                landmark: addr.landmark
              }
            } catch { return {} }
          })() : {})
        },
        items: orderItems
      }
    })

    return NextResponse.json(paginatedResponse(mapped, page, limit, total))
  } catch (error) {
    console.error('[Orders] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// POST /api/v1/orders
export async function POST(request: NextRequest) {
  try {
    const { t } = getTranslations(request)
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })

    const body = await request.json()
    const { storeId, productId, buyerId, quantity, notes } = body

    if (!storeId || !buyerId) {
      return NextResponse.json(errorResponse('storeId and buyerId are required'), { status: 400 })
    }

    // Verify store ownership
    const store = await queryOne<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM stores WHERE id = ? AND deleted_at IS NULL', [storeId]
    )
    if (!store || (payload.role !== 'admin' && store.user_id !== payload.userId)) {
      return NextResponse.json(errorResponse(t('storeNotFound')), { status: 403 })
    }

    // Check buyer blacklist
    const buyer = await queryOne<{ id: number; is_blacklisted: number }>(
      'SELECT id, is_blacklisted FROM buyers WHERE id = ?', [buyerId]
    )
    if (buyer?.is_blacklisted) {
      return NextResponse.json(errorResponse('Buyer is blacklisted'), { status: 403 })
    }

    // Calculate price
    let totalAmount = 0
    if (productId) {
      const product = await queryOne<{ price: number; discount: number }>(
        'SELECT price, discount FROM products WHERE id = ? AND store_id = ?', [productId, storeId]
      )
      if (!product) {
        return NextResponse.json(errorResponse('Product not found in store'), { status: 404 })
      }
      const qty = quantity || 1
      const unitPrice = Number(product.price) * (1 - Number(product.discount || 0) / 100)
      totalAmount = Math.round(unitPrice * qty * 100) / 100
    }

    const orderId = await insert(
      `INSERT INTO orders (store_id, buyer_id, status, internal_notes, total_amount, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, ?, NOW(), NOW())`,
      [storeId, buyerId, notes || null, totalAmount]
    )

    // Create single order item for backward compatibility in dashboard creation
    if (productId) {
      const product = await queryOne<{ price: number; discount: number }>(
        'SELECT price, discount FROM products WHERE id = ?', [productId]
      )
      if (product) {
        const unitPrice = Number(product.price) * (1 - Number(product.discount || 0) / 100)
        await insert(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price, created_at) VALUES (?, ?, ?, ?, NOW())',
          [orderId, productId, quantity || 1, unitPrice]
        )
      }
    }

    // Update buyer total_orders
    await queryOne('UPDATE buyers SET total_orders = total_orders + 1, updated_at = NOW() WHERE id = ?', [buyerId])

    return NextResponse.json(
      successResponse({
        id: String(orderId),
        storeId: String(storeId),
        buyerId: String(buyerId),
        totalPrice: totalAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: [] // In a real app we'd fetch or return what we created
      }, 'Order created successfully'),
      { status: 201 }
    )
  } catch (error) {
    console.error('[Orders] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
