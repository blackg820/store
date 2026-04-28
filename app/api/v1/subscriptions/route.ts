import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, insert, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    // Fetch subscription joined with plan info
    const sub = await queryOne<any>(
      `SELECT s.*, p.code as plan_code, p.name as plan_name 
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = ? 
       ORDER BY s.created_at DESC LIMIT 1`,
      [payload.userId]
    )

    if (!sub) {
      // Get starter plan ID
      const starterPlan = await queryOne<any>('SELECT id FROM plans WHERE code = "starter"')
      const planId = starterPlan?.id || 1

      // Auto-create starter subscription if missing
      const newSubId = await insert(
        'INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end) VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))',
        [payload.userId, planId, 'active']
      )
      const newSub = await queryOne<any>(
        `SELECT s.*, p.code as plan_code, p.name as plan_name 
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.id = ?`, 
        [newSubId]
      )
      return NextResponse.json(successResponse(mapSubscription(newSub)))
    }

    return NextResponse.json(successResponse(mapSubscription(sub)))
  } catch (error) {
    console.error('[Subscriptions] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

function mapSubscription(sub: any) {
  return {
    id: String(sub.id),
    userId: String(sub.user_id),
    planId: sub.plan_code,
    planCode: sub.plan_code,
    planName: sub.plan_name,
    status: sub.status,
    stripeSubscriptionId: sub.stripe_subscription_id,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
  }
}
