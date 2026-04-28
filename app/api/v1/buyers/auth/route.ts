import { NextRequest, NextResponse } from 'next/server'
import { queryOne, insert } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/jwt'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'buyer-secret-key-123'

// POST /api/v1/buyers/auth (Login or Register)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, phone, email, password, name, governorate, district, landmark } = body

    if (!phone || !password) {
      return NextResponse.json(errorResponse('Phone and password are required'), { status: 400 })
    }

    if (action === 'register') {
      // 1. Check if exists
      const existing = await queryOne('SELECT id FROM buyers WHERE phone = ?', [phone])
      if (existing) {
        return NextResponse.json(errorResponse('Phone number already registered'), { status: 400 })
      }

      // 2. Hash password
      const passwordHash = await bcrypt.hash(password, 10)

      // 3. Create buyer
      const addr = JSON.stringify({ governorate, district, landmark })
      const buyerId = await insert(
        'INSERT INTO buyers (phone, email, password_hash, name, address, total_orders, rejected_orders, risk_level, is_blacklisted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, 0, NOW(), NOW())',
        [phone, email || null, passwordHash, name, addr, 'low']
      )

      // 4. Generate token
      const token = jwt.sign({ buyerId, phone, role: 'buyer' }, JWT_SECRET, { expiresIn: '30d' })

      return NextResponse.json(successResponse({ token, buyer: { id: buyerId, name, phone, email, governorate, district, landmark } }, 'Registration successful'))
    } 
    
    else if (action === 'login') {
      const buyer = await queryOne<any>(
        'SELECT * FROM buyers WHERE phone = ?', [phone]
      )

      if (!buyer || !buyer.password_hash) {
        return NextResponse.json(errorResponse('Invalid phone or password'), { status: 401 })
      }

      const valid = await bcrypt.compare(password, buyer.password_hash)
      if (!valid) {
        return NextResponse.json(errorResponse('Invalid phone or password'), { status: 401 })
      }

      const addr = buyer.address ? (typeof buyer.address === 'string' ? JSON.parse(buyer.address) : buyer.address) : {}
      const token = jwt.sign({ buyerId: buyer.id, phone: buyer.phone, role: 'buyer' }, JWT_SECRET, { expiresIn: '30d' })

      return NextResponse.json(successResponse({ 
        token, 
        buyer: { 
          id: buyer.id, 
          name: buyer.name, 
          phone: buyer.phone, 
          email: buyer.email,
          governorate: addr.governorate,
          district: addr.district,
          landmark: addr.landmark
        } 
      }, 'Login successful'))
    }

    return NextResponse.json(errorResponse('Invalid action'), { status: 400 })
  } catch (error) {
    console.error('[Buyer Auth] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
