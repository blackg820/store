import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

// PATCH /api/v1/orders/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { status, internalNotes } = body

    const validStatuses = ['pending', 'confirmed', 'delivered', 'returned', 'problematic']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(errorResponse('Invalid status'), { status: 400 })
    }

    // Get current order with ownership check
    const order = await queryOne<Record<string, unknown>>(
      `SELECT o.*, s.user_id FROM orders o JOIN stores s ON o.store_id = s.id WHERE o.id = ? AND o.deleted_at IS NULL`,
      [id]
    )

    if (!order) {
      return NextResponse.json(errorResponse('Order not found'), { status: 404 })
    }

    if (payload.role !== 'admin' && Number(order.user_id) !== payload.userId) {
      return NextResponse.json(errorResponse('Access denied'), { status: 403 })
    }

    const previousStatus = order.status

    // Update order status
    let updateSql = 'UPDATE orders SET status = ?, updated_at = NOW()'
    const updateParams: unknown[] = [status]

    if (internalNotes) {
      updateSql += ', internal_notes = ?'
      updateParams.push(internalNotes)
    }
    updateSql += ' WHERE id = ?'
    updateParams.push(id)

    await execute(updateSql, updateParams)

    // Update buyer stats on rejection
    if (status === 'returned' || status === 'problematic') {
      await execute(
        'UPDATE buyers SET rejected_orders = rejected_orders + 1, updated_at = NOW() WHERE id = ?',
        [order.buyer_id]
      )
      // Recalculate risk
      const buyer = await queryOne<{ total_orders: number; rejected_orders: number }>(
        'SELECT total_orders, rejected_orders FROM buyers WHERE id = ?', [order.buyer_id]
      )
      if (buyer) {
        const ratio = buyer.total_orders > 0 ? buyer.rejected_orders / buyer.total_orders : 0
        const newRisk = ratio > 0.5 ? 'high' : ratio > 0.2 ? 'medium' : 'low'
        await execute('UPDATE buyers SET risk_level = ? WHERE id = ?', [newRisk, order.buyer_id])
      }
    }

    // Log audit
    await execute(
      `INSERT INTO audit_logs (user_id, event, auditable_type, auditable_id, old_values, new_values, created_at, updated_at)
       VALUES (?, 'status_change', 'order', ?, ?, ?, NOW(), NOW())`,
      [payload.userId, id, JSON.stringify({ status: previousStatus }), JSON.stringify({ status })]
    )

    return NextResponse.json(successResponse({
      orderId: id,
      previousStatus,
      newStatus: status,
    }, 'Order status updated'))
  } catch (error) {
    console.error('[Orders] Status update error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
