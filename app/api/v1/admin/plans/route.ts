import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

// GET /api/v1/admin/plans
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Admin access required'), { status: 403 })
    }

    const plans = await query('SELECT * FROM plans ORDER BY id ASC')
    return NextResponse.json(successResponse(plans))
  } catch (error) {
    console.error('[Admin Plans] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// PATCH /api/v1/admin/plans/[id] - Handled in the same route file for simplicity or nested
// Actually, I'll use /api/v1/admin/plans for bulk or just create a dynamic route if needed.
// For now, I'll handle the update here by passing id in body or use a dynamic route.

export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Admin access required'), { status: 403 })
    }

    const { id, name, price, duration_days, status, storage_gb, stores_limit, products_limit } = await request.json()

    if (!id) return NextResponse.json(errorResponse('Plan ID is required'), { status: 400 })

    await execute(
      `UPDATE plans SET name = ?, price = ?, duration_days = ?, status = ?, storage_gb = ?, stores_limit = ?, products_limit = ?, updated_at = NOW() WHERE id = ?`,
      [name, price, duration_days, status, storage_gb, stores_limit, products_limit, id]
    )

    return NextResponse.json(successResponse(null, 'Plan updated successfully'))
  } catch (error) {
    console.error('[Admin Plans] PATCH error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
