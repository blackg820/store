import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute, query } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const subscriptionId = resolvedParams.id
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    const body = await request.json()
    const { planId, status, endDate } = body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (planId !== undefined) { 
      let targetPlanId = planId
      if (typeof planId === 'string' && isNaN(Number(planId))) {
        const plan = await queryOne<any>('SELECT id FROM plans WHERE code = ?', [planId])
        if (!plan) return NextResponse.json(errorResponse(`Plan code "${planId}" not found`), { status: 404 })
        targetPlanId = plan.id
      }
      updates.push('plan_id = ?')
      values.push(targetPlanId) 
    }

    if (status !== undefined) { 
      updates.push('status = ?')
      values.push(status) 
    }

    if (endDate !== undefined) { 
      const mysqlEndDate = endDate ? new Date(endDate).toISOString().slice(0, 19).replace('T', ' ') : null
      updates.push('current_period_end = ?')
      values.push(mysqlEndDate) 
    }

    updates.push('updated_at = NOW()')

    if (updates.length > 1) {
      values.push(subscriptionId)
      await execute(`UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`, values)
    }

    return NextResponse.json(successResponse({ id: subscriptionId }, 'Subscription updated successfully'))
  } catch (error) {
    console.error('[Admin Subscription Update] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const subscriptionId = resolvedParams.id
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    await execute('DELETE FROM subscriptions WHERE id = ?', [subscriptionId])

    return NextResponse.json(successResponse({ id: subscriptionId }, 'Subscription deleted successfully'))
  } catch (error) {
    console.error('[Admin Subscription Delete] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
