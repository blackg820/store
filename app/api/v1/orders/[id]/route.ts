import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

// PATCH /api/v1/orders/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    // Check order existence and ownership
    const order = await queryOne<{ id: number; store_id: number; buyer_id: number }>(
      'SELECT o.id, o.store_id, o.buyer_id FROM orders o JOIN stores s ON o.store_id = s.id WHERE o.id = ?', [id]
    )
    if (!order) return NextResponse.json(errorResponse('Order not found'), { status: 404 })

    const store = await queryOne<{ user_id: number }>('SELECT user_id FROM stores WHERE id = ?', [order.store_id])
    if (!store || (payload.role !== 'admin' && store.user_id !== payload.userId)) {
      return NextResponse.json(errorResponse('Access denied'), { status: 403 })
    }

    const body = await request.json()
    const { 
      status, internalNotes, totalAmount, deliveryFee,
      buyerName, buyerPhone, governorate, district, landmark
    } = body

    // Update Order fields
    const orderUpdates: string[] = []
    const orderParams: unknown[] = []

    if (status !== undefined) { orderUpdates.push('status = ?'); orderParams.push(status) }
    if (internalNotes !== undefined) { orderUpdates.push('internal_notes = ?'); orderParams.push(internalNotes) }
    if (totalAmount !== undefined) { orderUpdates.push('total_amount = ?'); orderParams.push(totalAmount) }
    if (deliveryFee !== undefined) { orderUpdates.push('delivery_fee = ?'); orderParams.push(deliveryFee) }

    if (orderUpdates.length > 0) {
      orderParams.push(id)
      await execute(`UPDATE orders SET ${orderUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`, orderParams)
    }

    // Update Buyer fields if provided
    const buyerUpdates: string[] = []
    const buyerParams: unknown[] = []

    if (buyerName !== undefined) { buyerUpdates.push('name = ?'); buyerParams.push(buyerName) }
    if (buyerPhone !== undefined) { buyerUpdates.push('phone = ?'); buyerParams.push(buyerPhone) }
    
    // Address fields are stored as JSON in the database usually, or as separate columns depending on the schema.
    // Let's check the schema for buyers.
    
    if (buyerUpdates.length > 0) {
      buyerParams.push(order.buyer_id)
      await execute(`UPDATE buyers SET ${buyerUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`, buyerParams)
    }

    // Handle address if governorate/district/landmark are provided
    if (governorate !== undefined || district !== undefined || landmark !== undefined) {
      const currentBuyer = await queryOne<{ address: string }>('SELECT address FROM buyers WHERE id = ?', [order.buyer_id])
      let addr = {}
      try { addr = JSON.parse(currentBuyer?.address || '{}') } catch {}
      
      const newAddr = {
        ...addr,
        ...(governorate !== undefined && { governorate }),
        ...(district !== undefined && { district }),
        ...(landmark !== undefined && { landmark }),
      }
      
      await execute('UPDATE buyers SET address = ? WHERE id = ?', [JSON.stringify(newAddr), order.buyer_id])
    }

    return NextResponse.json(successResponse(null, 'Order updated successfully'))
  } catch (error) {
    console.error('[Order Update] Error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// DELETE /api/v1/orders/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    // Soft delete
    await execute('UPDATE orders SET deleted_at = NOW() WHERE id = ?', [id])
    return NextResponse.json(successResponse(null, 'Order deleted successfully'))
  } catch (error) {
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
