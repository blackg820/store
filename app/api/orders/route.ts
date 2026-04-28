import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, insert } from '@/lib/db'

// REST API for orders (internal/legacy endpoint)
// The primary API is at /api/v1/orders

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const storeId = searchParams.get('storeId')
  const status = searchParams.get('status')

  let where = 'o.deleted_at IS NULL'
  const params: any[] = []

  if (storeId) { where += ' AND o.store_id = ?'; params.push(storeId) }
  if (status) { where += ' AND o.status = ?'; params.push(status) }

  const orders = await query(
    `SELECT o.*, s.name as store_name, b.name as buyer_name, b.phone as buyer_phone
     FROM orders o
     JOIN stores s ON o.store_id = s.id
     JOIN buyers b ON o.buyer_id = b.id
     WHERE ${where}
     ORDER BY o.created_at DESC LIMIT 50`,
    params
  )

  return NextResponse.json({ success: true, data: orders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const required = ['storeId', 'productId', 'buyerPhone', 'buyerName', 'quantity']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Find or create buyer
    let buyer = await queryOne<{ id: number }>('SELECT id FROM buyers WHERE phone = ?', [body.buyerPhone])
    if (!buyer) {
      const buyerId = await insert(
        'INSERT INTO buyers (phone, name, address, total_orders, rejected_orders, risk_level, is_blacklisted, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, 0, NOW(), NOW())',
        [body.buyerPhone, body.buyerName, '{}', 'low']
      )
      buyer = { id: buyerId }
    }

    // Get product price
    const product = await queryOne<{ price: number; discount: number }>(
      'SELECT price, discount FROM products WHERE id = ? AND store_id = ?', [body.productId, body.storeId]
    )
    const unitPrice = product ? Number(product.price) * (1 - Number(product.discount || 0) / 100) : 0
    const totalAmount = unitPrice * (body.quantity || 1)

    const orderId = await insert(
      `INSERT INTO orders (store_id, product_id, buyer_id, status, total_amount, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, NOW(), NOW())`,
      [body.storeId, body.productId, buyer.id, totalAmount]
    )

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: String(orderId),
        storeId: body.storeId,
        status: 'pending',
        totalAmount,
        createdAt: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
