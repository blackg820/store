import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const body = await request.json()
    const { name, nameAr, slug, customFields, isActive } = body

    // Check ownership if not admin
    const productType = await query('SELECT store_id FROM product_types WHERE id = ?', [id])
    if ((productType as any[]).length === 0) return NextResponse.json(errorResponse('Product type not found'), { status: 404 })

    const storeId = (productType as any[])[0].store_id
    const store = await query('SELECT id FROM stores WHERE id = ? AND user_id = ?', [storeId, payload.userId])
    
    if (payload.role !== 'admin' && (store as any[]).length === 0) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    await execute(
      `UPDATE product_types 
       SET name = ?, name_ar = ?, slug = ?, \`schema\` = ?, is_active = ?, updated_at = NOW() 
       WHERE id = ?`,
      [
        name, 
        nameAr || name, 
        slug || name.toLowerCase().replace(/\s+/g, '-'), 
        JSON.stringify(customFields || []),
        isActive !== undefined ? (isActive ? 1 : 0) : 1,
        id
      ]
    )

    return NextResponse.json(successResponse(null, 'Product type updated successfully'))
  } catch (error: any) {
    console.error('[ProductTypes] PATCH error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    // Check ownership if not admin
    const productType = await query('SELECT store_id FROM product_types WHERE id = ?', [id])
    if ((productType as any[]).length === 0) return NextResponse.json(errorResponse('Product type not found'), { status: 404 })

    const storeId = (productType as any[])[0].store_id
    const store = await query('SELECT id FROM stores WHERE id = ? AND user_id = ?', [storeId, payload.userId])
    
    if (payload.role !== 'admin' && (store as any[]).length === 0) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    await execute('UPDATE product_types SET deleted_at = NOW() WHERE id = ?', [id])

    return NextResponse.json(successResponse(null, 'Product type deleted successfully'))
  } catch (error: any) {
    console.error('[ProductTypes] DELETE error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
