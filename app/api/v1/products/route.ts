import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, insert, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse, paginatedResponse } from '@/lib/jwt'
import { checkProductLimit } from '@/lib/subscription-utils'
import { getServerTranslations, getTranslations } from '@/lib/i18n-server'

// GET /api/v1/products
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
    const categoryId = searchParams.get('category_id')
    const productTypeId = searchParams.get('product_type_id')
    const search = searchParams.get('search') || ''
    const minPrice = parseFloat(searchParams.get('min_price') || '0')
    const maxPrice = parseFloat(searchParams.get('max_price') || '999999')
    const offset = (page - 1) * limit

    // Build query with tenant isolation
    let where = 'p.deleted_at IS NULL'
    const params: unknown[] = []

    if (payload.role !== 'admin') {
      where += ' AND s.user_id = ?'
      params.push(payload.userId)
    }
    if (storeId) { where += ' AND p.store_id = ?'; params.push(storeId) }
    if (categoryId) { where += ' AND p.category_id = ?'; params.push(categoryId) }
    if (productTypeId) { where += ' AND p.product_type_id = ?'; params.push(productTypeId) }
    if (search) { 
      where += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`) 
    }
    where += ' AND p.price >= ? AND p.price <= ?'
    params.push(minPrice, maxPrice)

    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM products p JOIN stores s ON p.store_id = s.id WHERE ${where}`, params
    )
    const total = countResult[0]?.total || 0

    const products = await query(
      `SELECT p.*, s.name as store_name, s.slug as store_slug,
              pt.name as product_type_name, c.name as category_name
       FROM products p
       JOIN stores s ON p.store_id = s.id
       LEFT JOIN product_types pt ON p.product_type_id = pt.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${where}
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    if (products.length === 0) {
      return NextResponse.json(paginatedResponse([], page, limit, total))
    }

    // Fetch dependencies for these products
    const productIds = (products as any[]).map((p) => p.id)
    const mediaResults = await query<any>(
      `SELECT * FROM media WHERE product_id IN (${productIds.join(',')})`
    )
    const options = await query<any>(
      `SELECT * FROM product_options WHERE product_id IN (${productIds.join(',')})`
    )
    const variants = await query<any>(
      `SELECT * FROM product_variants WHERE product_id IN (${productIds.join(',')})`
    )

    // Map to frontend shape
    const mapped = (products as Record<string, unknown>[]).map(p => {
      const parsedCustom = typeof p.custom_data === 'string' ? JSON.parse(p.custom_data) : (p.custom_data || {})
      
      const pOptions = options.filter((o: any) => o.product_id === p.id).map((o: any) => ({
        id: String(o.id),
        name: o.name,
        nameAr: o.name_ar,
        nameKu: o.name_ku,
        values: typeof o.values_json === 'string' ? JSON.parse(o.values_json) : (o.values_json || []),
        swatches: typeof o.swatches_json === 'string' ? JSON.parse(o.swatches_json) : (o.swatches_json || {}),
        type: o.type || 'choice'
      }))

      const pVariants = variants.filter((v: any) => v.product_id === p.id).map((v: any) => ({
        id: String(v.id),
        sku: v.sku,
        priceOverride: v.price_override ? Number(v.price_override) : undefined,
        stockQuantity: v.stock_quantity,
        optionValues: typeof v.option_values === 'string' ? JSON.parse(v.option_values) : (v.option_values || {})
      }))

      return {
        id: String(p.id),
        storeId: String(p.store_id),
        sku: p.sku || null,
        productCode: p.product_code || String(p.id),
        productTypeId: p.product_type_id ? String(p.product_type_id) : undefined,
        categoryId: p.category_id ? String(p.category_id) : undefined,
        title: p.title,
        titleAr: p.title_ar || p.title,
        titleKu: p.title_ku || p.title,
        description: p.description || '',
        descriptionAr: p.description_ar || p.description || '',
        descriptionKu: p.description_ku || p.description || '',
        price: Number(p.price),
        costPrice: Number(p.cost_price) || 0,
        discount: Number(p.discount) || 0,
        deliveryFee: Number(p.delivery_fee) || 0,
        needsDeposit: p.needs_deposit === 1,
        depositAmount: Number(p.deposit_amount) || 0,
        options: pOptions,
        variants: pVariants,
        media: [
          ...(parsedCustom?.images || []).map((url: string, idx: number) => ({
            id: `legacy-${idx}`,
            url,
            type: 'image'
          })),
          ...(mediaResults as any[]).filter((m: any) => m.product_id === p.id).map((m: any) => ({
            id: String(m.id),
            url: m.url,
            type: m.type
          }))
        ],
        isActive: !p.deleted_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        averageRating: Number(p.rating) || 0,
        totalRatings: Number(p.rating_count) || 0,
        customData: parsedCustom,
        store: { name: p.store_name, slug: p.store_slug },
        productType: p.product_type_name ? { name: p.product_type_name } : undefined,
        category: p.category_name ? { name: p.category_name } : undefined,
      }
    })

    return NextResponse.json(paginatedResponse(mapped, page, limit, total))
  } catch (error) {
    console.error('[Products] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// POST /api/v1/products
export async function POST(request: NextRequest) {
  try {
    const { t } = getTranslations(request)

    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) {
      return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') {
      return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })
    }

    const body = await request.json()
    const { 
      storeId, sku, productTypeId, categoryId, 
      title, titleAr, titleKu, description, descriptionAr, descriptionKu,
      price, costPrice, discount, deliveryFee, 
      needsDeposit, depositAmount,
      customData,
      options, variants, media
    } = body

    const effectiveTitle = title || titleAr || titleKu

    if (!storeId || !effectiveTitle || !price) {
      return NextResponse.json(errorResponse('storeId, title (any language), and price are required'), { status: 400 })
    }

    const finalTitle = title || effectiveTitle

    // Check plan limits
    const limitCheck = await checkProductLimit(Number(storeId))
    if (!limitCheck.allowed) {
      const errorMessage = limitCheck.errorKey 
        ? t(limitCheck.errorKey as any, limitCheck.errorData)
        : (limitCheck.error || t('planLimitReached'))
      
      return NextResponse.json(errorResponse(errorMessage), { status: 403 })
    }

    // Verify store ownership
    const store = await queryOne<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM stores WHERE id = ? AND deleted_at IS NULL', [storeId]
    )
    if (!store || (payload.role !== 'admin' && store.user_id !== payload.userId)) {
      return NextResponse.json(errorResponse('Store not found or access denied'), { status: 403 })
    }

    // Product type ID logic
    let ptId = productTypeId
    if (!ptId) {
      const existing = await queryOne<{ id: number }>('SELECT id FROM product_types WHERE store_id = ? AND deleted_at IS NULL LIMIT 1', [storeId])
      ptId = existing ? existing.id : await insert('INSERT INTO product_types (store_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [storeId, 'General', 'general'])
    }

    // Auto-generate internal product code
    const generatedProductCode = `P-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const newId = await insert(
      `INSERT INTO products (
         store_id, sku, product_code, product_type_id, category_id, 
         title, title_ar, title_ku, description, description_ar, description_ku, 
         price, cost_price, discount, delivery_fee, 
         needs_deposit, deposit_amount,
         custom_data, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        storeId, sku || null, generatedProductCode, ptId, categoryId || null, 
        finalTitle, titleAr || finalTitle, titleKu || finalTitle, description || '', descriptionAr || description || '', descriptionKu || description || '',
        parseFloat(price), parseFloat(costPrice || 0), discount ? parseFloat(discount) : 0, parseFloat(deliveryFee || 0),
        needsDeposit ? 1 : 0, parseFloat(depositAmount || 0),
        customData ? JSON.stringify(customData) : null
      ]
    )

    // Save Options
    if (options && Array.isArray(options)) {
      for (const opt of options) {
        await insert(
          'INSERT INTO product_options (product_id, name, name_ar, name_ku, values_json, swatches_json, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newId, opt.name, opt.nameAr || null, opt.nameKu || null, JSON.stringify(opt.values), JSON.stringify(opt.swatches || {}), opt.type || 'choice']
        )
      }
    }

    // Save Variants
    if (variants && Array.isArray(variants)) {
      for (const variant of variants) {
        await insert(
          'INSERT INTO product_variants (product_id, sku, price_override, stock_quantity, option_values) VALUES (?, ?, ?, ?, ?)',
          [newId, variant.sku || null, variant.priceOverride || null, variant.stockQuantity || 0, JSON.stringify(variant.optionValues)]
        )
      }
    }

    // Link Media
    if (media && Array.isArray(media)) {
      for (const item of media) {
        if (item.id && !String(item.id).startsWith('manual-')) {
          // It's an existing media record from /api/v1/media
          await execute(
            'UPDATE media SET product_id = ? WHERE id = ?',
            [newId, item.id]
          )
        } else {
          // It's a manual URL, create a new record
          await execute(
            'INSERT INTO media (store_id, product_id, url, type, visibility) VALUES (?, ?, ?, ?, ?)',
            [storeId, newId, item.url, item.type || 'image', 'public']
          )
        }
      }
    }

    return NextResponse.json(
      successResponse({
        id: String(newId),
        storeId: String(storeId),
        sku: sku || null,
        productCode: generatedProductCode,
        title: finalTitle,
        price: parseFloat(price),
        isActive: true,
        createdAt: new Date().toISOString(),
      }, 'Product created successfully with options and variants'),
      { status: 201 }
    )
  } catch (error) {
    console.error('[Products] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
