import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    const users = await query<any>(
      `SELECT u.id, u.email, u.name, u.role, u.mode, u.status, u.created_at,
              (SELECT COUNT(*) FROM stores WHERE user_id = u.id AND deleted_at IS NULL) as store_count,
              sub.plan_code as subscription_plan, sub.status as subscription_status, sub.current_period_end as subscription_end
       FROM users u
       LEFT JOIN subscriptions sub ON u.id = sub.user_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    )

    const mapped = users.map((u: any) => ({
      id: String(u.id),
      email: u.email,
      name: u.name,
      role: u.role,
      mode: u.mode,
      status: u.status,
      isActive: u.status === 'active',
      createdAt: u.created_at,
      storeCount: u.store_count,
      subscription: {
        plan: u.subscription_plan || 'none',
        status: u.subscription_status || 'none',
        endDate: u.subscription_end
      }
    }))

    return NextResponse.json(successResponse(mapped))
  } catch (error) {
    console.error('[Admin Users] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    const { name, email, password, role, mode, planId } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(errorResponse('Name, email and password are required'), { status: 400 })
    }

    // Check if email already exists
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email])
    if (existing) {
      return NextResponse.json(errorResponse('Email already registered'), { status: 400 })
    }

    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    const userId = await query<any>(
      `INSERT INTO users (name, email, password, role, mode, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [name, email, hashedPassword, role || 'user', mode || 'controlled']
    )

    // Automatically create subscription if planId provided or default to starter
    const targetPlanId = planId || 1 // 1 is usually starter
    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())`,
      [userId, targetPlanId]
    )

    return NextResponse.json(successResponse({ 
      id: String(userId),
      isActive: true,
      status: 'active'
    }, 'User and subscription created successfully'))
  } catch (error) {
    console.error('[Admin Users] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
