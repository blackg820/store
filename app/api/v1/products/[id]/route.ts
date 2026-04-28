import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'
import { getTranslations } from '@/lib/i18n-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = resolvedParams.id
    
    const { t } = getTranslations(request)
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })

    const body = await request.json()
    const { 
      sku, title, titleAr, titleKu, description, descriptionAr, descriptionKu,
      price, costPrice, discount, deliveryFee, 
      needsDeposit, depositAmount,
      isActive, customData,
      options, variants, media
    } = body

    // Verify ownership
    const product = await queryOne<{ store_id: number; user_id: number }>(
      'SELECT p.store_id, s.user_id FROM products p JOIN stores s ON p.store_id = s.id WHERE p.id = ? AND p.deleted_at IS NULL',
      [productId]
    )

    if (!product) {
      return NextResponse.json(errorResponse(t('noData')), { status: 404 })
    }

    if (payload.role !== 'admin' && product.user_id !== payload.userId) {
      return NextResponse.json(errorResponse(t('storeNotFound')), { status: 403 })
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (sku !== undefined) { updates.push('sku = ?'); values.push(sku || null) }
    if (title !== undefined) { updates.push('title = ?'); values.push(title) }
    if (titleAr !== undefined) { updates.push('title_ar = ?'); values.push(titleAr) }
    if (titleKu !== undefined) { updates.push('title_ku = ?'); values.push(titleKu) }
    if (description !== undefined) { updates.push('description = ?'); values.push(description) }
    if (descriptionAr !== undefined) { updates.push('description_ar = ?'); values.push(descriptionAr) }
    if (descriptionKu !== undefined) { updates.push('description_ku = ?'); values.push(descriptionKu) }
    if (price !== undefined) { updates.push('price = ?'); values.push(parseFloat(price)) }
    if (costPrice !== undefined) { updates.push('cost_price = ?'); values.push(parseFloat(costPrice)) }
    if (discount !== undefined) { updates.push('discount = ?'); values.push(parseFloat(discount)) }
    if (deliveryFee !== undefined) { updates.push('delivery_fee = ?'); values.push(parseFloat(deliveryFee)) }
    if (needsDeposit !== undefined) { updates.push('needs_deposit = ?'); values.push(needsDeposit ? 1 : 0) }
    if (depositAmount !== undefined) { updates.push('deposit_amount = ?'); values.push(parseFloat(depositAmount)) }
    if (customData !== undefined) { updates.push('custom_data = ?'); values.push(JSON.stringify(customData)) }
    
    updates.push('updated_at = NOW()')

    if (updates.length > 1) {
      values.push(productId)
      await execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values)
    }

    // Handle Options Update (Delete and Re-insert)
    if (options !== undefined && Array.isArray(options)) {
      await execute('DELETE FROM product_options WHERE product_id = ?', [productId])
      for (const opt of options) {
        await execute(
          'INSERT INTO product_options (product_id, name, name_ar, name_ku, values_json, swatches_json, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [productId, opt.name, opt.nameAr || null, opt.nameKu || null, JSON.stringify(opt.values), JSON.stringify(opt.swatches || {}), opt.type || 'choice']
        )
      }
    }

    // Handle Variants Update (Delete and Re-insert)
    if (variants !== undefined && Array.isArray(variants)) {
      await execute('DELETE FROM product_variants WHERE product_id = ?', [productId])
      for (const variant of variants) {
        await execute(
          'INSERT INTO product_variants (product_id, sku, price_override, stock_quantity, option_values) VALUES (?, ?, ?, ?, ?)',
          [productId, variant.sku || null, variant.priceOverride || null, variant.stockQuantity || 0, JSON.stringify(variant.optionValues)]
        )
      }
    }

    // Handle Media Update
    if (media !== undefined && Array.isArray(media)) {
      // Get store_id for media insertion
      const productData = await queryOne<{ store_id: number }>('SELECT store_id FROM products WHERE id = ?', [productId])
      const storeId = productData?.store_id

      // Unlink all current media for this product
      await execute('UPDATE media SET product_id = NULL WHERE product_id = ?', [productId])
      
      // Link the new media list
      for (const item of media) {
        if (item.id && !String(item.id).startsWith('manual-') && !String(item.id).startsWith('legacy-')) {
          await execute(
            'UPDATE media SET product_id = ? WHERE id = ?',
            [productId, item.id]
          )
        } else {
          // Manual URL or new item or legacy item we want to "promote" to media table
          await execute(
            'INSERT INTO media (store_id, product_id, url, type, visibility) VALUES (?, ?, ?, ?, ?)',
            [storeId, productId, item.url, item.type || 'image', 'public']
          )
        }
      }
    }

    return NextResponse.json(successResponse({ id: productId }, 'Product updated successfully'))
  } catch (error) {
    console.error('[Product Update] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = resolvedParams.id
    
    const { t } = getTranslations(request)
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })

    // Verify ownership
    const product = await queryOne<{ store_id: number; user_id: number }>(
      'SELECT p.store_id, s.user_id FROM products p JOIN stores s ON p.store_id = s.id WHERE p.id = ? AND p.deleted_at IS NULL',
      [productId]
    )

    if (!product) {
      return NextResponse.json(errorResponse(t('noData')), { status: 404 })
    }

    if (payload.role !== 'admin' && product.user_id !== payload.userId) {
      return NextResponse.json(errorResponse(t('storeNotFound')), { status: 403 })
    }

    await execute('UPDATE products SET deleted_at = NOW() WHERE id = ?', [productId])

    return NextResponse.json(successResponse({ id: productId }, 'Product deleted successfully'))
  } catch (error) {
    console.error('[Product Delete] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
