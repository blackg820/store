import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse, paginatedResponse } from '@/lib/jwt'
import { insert } from '@/lib/db'

// GET /api/v1/buyers
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const riskLevel = searchParams.get('risk_level')
    const blacklisted = searchParams.get('blacklisted')
    const offset = (page - 1) * limit

    // Phone lookup — exact match (with tenant isolation)
    if (phone) {
      let queryStr = 'SELECT b.* FROM buyers b WHERE b.phone = ? AND b.deleted_at IS NULL'
      const params: any[] = [phone]

      if (payload.role !== 'admin') {
        queryStr += ' AND EXISTS (SELECT 1 FROM orders o JOIN stores s ON o.store_id = s.id WHERE o.buyer_id = b.id AND s.user_id = ?)'
        params.push(payload.userId)
      }

      const buyer = await queryOne(queryStr, params)
      if (buyer) {
        return NextResponse.json(successResponse(mapBuyer(buyer as Record<string, unknown>)))
      }
      return NextResponse.json(errorResponse('Buyer not found or access denied'), { status: 404 })
    }

    let where = 'b.deleted_at IS NULL'
    const params: unknown[] = []

    if (payload.role !== 'admin') {
      where += ' AND EXISTS (SELECT 1 FROM orders o JOIN stores s ON o.store_id = s.id WHERE o.buyer_id = b.id AND s.user_id = ?)'
      params.push(payload.userId)
    }

    if (riskLevel) { where += ' AND b.risk_level = ?'; params.push(riskLevel) }
    if (blacklisted !== null && blacklisted !== undefined) {
      where += ' AND b.is_blacklisted = ?'
      params.push(blacklisted === 'true' ? 1 : 0)
    }

    const countResult = await query<{ total: number }>(
      `SELECT COUNT(DISTINCT b.id) as total FROM buyers b WHERE ${where}`, params
    )
    const total = countResult[0]?.total || 0

    const buyers = await query(
      `SELECT DISTINCT b.* FROM buyers b WHERE ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    const mapped = (buyers as Record<string, unknown>[]).map(mapBuyer)
    return NextResponse.json(paginatedResponse(mapped, page, limit, total))
  } catch (error) {
    console.error('[Buyers] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// POST /api/v1/buyers
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const body = await request.json()
    const { phone, name, governorate, district, landmark } = body

    if (!phone || !name) {
      return NextResponse.json(errorResponse('phone and name are required'), { status: 400 })
    }

    // Check duplicate phone
    const existing = await queryOne('SELECT id FROM buyers WHERE phone = ?', [phone])
    if (existing) {
      return NextResponse.json(errorResponse('Buyer with this phone already exists'), { status: 409 })
    }

    const address = JSON.stringify({ governorate: governorate || '', district: district || '', landmark: landmark || '' })

    const newId = await insert(
      'INSERT INTO buyers (phone, name, address, total_orders, rejected_orders, risk_level, is_blacklisted, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, 0, NOW(), NOW())',
      [phone, name, address, 'low']
    )

    return NextResponse.json(
      successResponse({
        id: String(newId),
        phone,
        name,
        governorate: governorate || '',
        district: district || '',
        landmark: landmark || '',
        totalOrders: 0,
        rejectedOrders: 0,
        riskScore: 'low',
        isBlacklisted: false,
        createdAt: new Date().toISOString(),
      }, 'Buyer created successfully'),
      { status: 201 }
    )
  } catch (error) {
    console.error('[Buyers] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

function mapBuyer(b: Record<string, unknown>) {
  const addr = typeof b.address === 'string' ? JSON.parse(b.address) : (b.address || {})
  return {
    id: String(b.id),
    phone: b.phone,
    name: b.name || '',
    governorate: addr.governorate || '',
    district: addr.district || '',
    landmark: addr.landmark || '',
    totalOrders: Number(b.total_orders) || 0,
    rejectedOrders: Number(b.rejected_orders) || 0,
    riskScore: b.risk_level || 'low',
    isBlacklisted: Boolean(b.is_blacklisted),
    createdAt: b.created_at,
  }
}
