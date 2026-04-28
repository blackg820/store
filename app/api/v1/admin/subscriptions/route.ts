import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

// GET /api/v1/admin/subscriptions
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Admin access required'), { status: 403 })
    }

    const subscriptions = await query<any>(
      `SELECT s.*, u.name as user_name, u.email as user_email, p.code as plan_code, p.name as plan_name 
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN plans p ON s.plan_id = p.id
       ORDER BY s.created_at DESC`
    )

    const mapped = subscriptions.map((s: any) => ({
      id: String(s.id),
      userId: String(s.user_id),
      userName: s.user_name,
      userEmail: s.user_email,
      planId: s.plan_code,
      planCode: s.plan_code,
      planName: s.plan_name,
      status: s.status,
      isActive: s.status === 'active' || s.status === 'trialing',
      startDate: s.current_period_start,
      endDate: s.current_period_end,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }))

    return NextResponse.json(successResponse(mapped))
  } catch (error) {
    console.error('[Admin Subscriptions] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Admin access required'), { status: 403 })
    }

    const { userId, planId, status, endDate } = await request.json()

    if (!userId || !planId) {
      return NextResponse.json(errorResponse('User ID and Plan ID are required'), { status: 400 })
    }

    // Resolve planId if it's a code (string)
    let targetPlanId = planId
    let targetPlanCode = ''
    if (typeof planId === 'string' && isNaN(Number(planId))) {
      const plan = await queryOne<any>('SELECT id, code FROM plans WHERE code = ?', [planId])
      if (!plan) return NextResponse.json(errorResponse(`Plan code "${planId}" not found`), { status: 404 })
      targetPlanId = plan.id
      targetPlanCode = plan.code
    } else {
      const plan = await queryOne<any>('SELECT id, code FROM plans WHERE id = ?', [planId])
      if (!plan) return NextResponse.json(errorResponse(`Plan ID "${planId}" not found`), { status: 404 })
      targetPlanId = plan.id
      targetPlanCode = plan.code
    }

    const mysqlEndDate = endDate ? new Date(endDate).toISOString().slice(0, 19).replace('T', ' ') : null

    // Check if subscription exists for this user
    const existing = await queryOne('SELECT id FROM subscriptions WHERE user_id = ?', [userId])

    if (existing) {
      await query(
        `UPDATE subscriptions 
         SET plan_id = ?, plan_code = ?, status = ?, current_period_end = ?, updated_at = NOW() 
         WHERE user_id = ?`,
        [targetPlanId, targetPlanCode, status || 'active', mysqlEndDate, userId]
      )
    } else {
      await query(
        `INSERT INTO subscriptions (user_id, plan_id, plan_code, status, current_period_start, current_period_end, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
        [userId, targetPlanId, targetPlanCode, status || 'active', mysqlEndDate]
      )
    }

    return NextResponse.json(successResponse(null, 'Subscription assigned successfully'))
  } catch (error) {
    console.error('[Admin Subscriptions] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
