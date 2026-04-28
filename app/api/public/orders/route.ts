import { NextResponse, type NextRequest } from 'next/server'
import { query, queryOne, insert, execute } from '@/lib/db'
import { processJobs } from '@/lib/queue'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { normalizePhone, validatePhone } from '@/lib/order-utils'
import { sendTelegramNotification } from '@/lib/telegram'
import { getServerTranslations } from '@/lib/i18n-server'

interface OrderItem {
  productId: string
  quantity: number
  options?: Record<string, string>
}

interface PublicOrderPayload {
  storeSlug?: string
  storeId?: string
  items: OrderItem[]
  buyerName: string
  buyerPhone: string
  governorate: string
  district: string
  landmark: string
  notes?: string
}

function validatePayload(body: unknown): { valid: true; data: PublicOrderPayload } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Invalid body' }
  const b = body as Record<string, any>

  if (!b.storeSlug && !b.storeId) {
    return { valid: false, error: 'storeSlug or storeId is required' }
  }

  // Handle single product or items array
  let items: OrderItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items
  } else if (b.productId) {
    items = [{ productId: String(b.productId), quantity: Number(b.quantity || 1), options: b.options }]
  }

  if (items.length === 0) {
    return { valid: false, error: 'At least one product is required' }
  }

  for (const item of items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) {
      return { valid: false, error: 'Invalid item data' }
    }
  }

  const required = ['buyerName', 'buyerPhone', 'governorate', 'district']
  for (const field of required) {
    if (b[field] === undefined || b[field] === null || b[field] === '') {
      return { valid: false, error: `${field} is required` }
    }
  }

  if (!validatePhone(String(b.buyerPhone))) {
    return { valid: false, error: 'Invalid phone number format' }
  }

  return {
    valid: true,
    data: {
      storeSlug: b.storeSlug ? String(b.storeSlug) : undefined,
      storeId: b.storeId ? String(b.storeId) : undefined,
      items,
      buyerName: String(b.buyerName).trim(),
      buyerPhone: normalizePhone(String(b.buyerPhone)),
      governorate: String(b.governorate).trim(),
      district: String(b.district).trim(),
      landmark: b.landmark ? String(b.landmark).trim() : '',
      notes: b.notes ? String(b.notes).trim() : undefined,
    },
  }
}

export async function POST(req: NextRequest) {
  const identifier = getClientIdentifier(req)
  const rl = checkRateLimit(`public-order:${identifier}`, RATE_LIMITS.publicOrder)

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', resetAt: rl.resetAt },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const body = await req.json().catch(() => null)
  const validation = validatePayload(body)

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const data = validation.data

  // Look up store
  let store: { id: number; name: string; name_ar: string } | null = null
  if (data.storeId) {
    store = await queryOne<{ id: number; name: string; name_ar: string }>(
      'SELECT id, name, name_ar FROM stores WHERE id = ? AND status = ? AND deleted_at IS NULL', [data.storeId, 'active']
    )
  } else if (data.storeSlug) {
    store = await queryOne<{ id: number; name: string; name_ar: string }>(
      'SELECT id, name, name_ar FROM stores WHERE slug = ? AND status = ? AND deleted_at IS NULL', [data.storeSlug, 'active']
    )
  }
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Find or create buyer
  let buyer = await queryOne<{ id: number; is_blacklisted: number }>(
    'SELECT id, is_blacklisted FROM buyers WHERE phone = ?', [data.buyerPhone]
  )

  if (buyer?.is_blacklisted) {
    return NextResponse.json({ error: 'Order cannot be placed' }, { status: 403 })
  }

  if (!buyer) {
    const addr = JSON.stringify({ governorate: data.governorate, district: data.district, landmark: data.landmark })
    const buyerId = await insert(
      'INSERT INTO buyers (phone, name, address, total_orders, rejected_orders, risk_level, is_blacklisted, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, 0, NOW(), NOW())',
      [data.buyerPhone, data.buyerName, addr, 'low']
    )
    buyer = { id: buyerId, is_blacklisted: 0 }
  }

  const orderGroupId = `G-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  let totalOrderAmount = 0
  let maxDeliveryFee = 0
  const orderItemsSummary: string[] = []
  const orderItemsToInsert: { productId: number, quantity: number, unitPrice: number, options: string }[] = []

  // 1. Prepare items and calculate total
  for (const item of data.items) {
    const product = await queryOne<{ id: number; sku: string; price: number; discount: number; title: string; title_ar: string }>(
      'SELECT id, sku, price, discount, title, title_ar FROM products WHERE id = ? AND store_id = ? AND deleted_at IS NULL', [item.productId, store.id]
    )
    
    if (!product) continue

    const unitPrice = Number(product.price) * (1 - Number(product.discount || 0) / 100)
    const itemTotalAmount = Math.round(unitPrice * item.quantity * 100) / 100
    totalOrderAmount += itemTotalAmount

    const deliveryFee = Number((product as any).delivery_fee || 0)
    if (deliveryFee > maxDeliveryFee) {
      maxDeliveryFee = deliveryFee
    }

    const optionsStr = item.options ? JSON.stringify(item.options) : null
    orderItemsToInsert.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice,
      options: optionsStr || ''
    })
    
    orderItemsSummary.push(`- ${product.title_ar || product.title} ${product.sku ? `(#${product.sku})` : ''} x${item.quantity}`)
  }

  if (orderItemsToInsert.length === 0) {
    return NextResponse.json({ error: 'Failed to process any products' }, { status: 400 })
  }

  // 2. Create the unified Order
  const orderId = await insert(
    `INSERT INTO orders (store_id, group_id, buyer_id, status, internal_notes, buyer_notes, total_amount, delivery_fee, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, NOW(), NOW())`,
    [store.id, orderGroupId, buyer.id, null, data.notes || null, totalOrderAmount + maxDeliveryFee, maxDeliveryFee]
  )

  // 3. Create Order Items
  for (const item of orderItemsToInsert) {
    await insert(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price, options, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [orderId, item.productId, item.quantity, item.unitPrice, item.options || null]
    )
  }

  // Update buyer order count
  await execute('UPDATE buyers SET total_orders = total_orders + 1, updated_at = NOW() WHERE id = ?', [buyer.id])

  // 4. Send Telegram Notification
  const { t: ts } = getServerTranslations('ar')
  const notificationMessage = ts('botNewOrder', {
    storeName: store.name_ar || store.name,
    orderGroupId,
    buyerName: data.buyerName,
    buyerPhone: data.buyerPhone,
    governorate: data.governorate,
    district: data.district,
    landmark: data.landmark,
    total: totalOrderAmount.toLocaleString(),
    items: orderItemsSummary.join('\n')
  })
  
  await sendTelegramNotification(String(store.id), notificationMessage, 'newOrders', { orderGroupId, orderId: String(orderId) }).catch(console.error)
  
  // Trigger queue processing immediately for near-instant notification
  await processJobs().catch(err => console.error('[Order API] Immediate worker trigger failed:', err))

  return NextResponse.json(
    { 
      success: true, 
      orderGroupId,
      orderId: String(orderId), 
      status: 'pending', 
      message: 'Order received.' 
    },
    { status: 201 }
  )
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
