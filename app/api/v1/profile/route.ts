import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

// PATCH /api/v1/profile
export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const body = await request.json()
    const { name, email } = body

    if (!name && !email) {
      return NextResponse.json(errorResponse('No fields to update'), { status: 400 })
    }

    // If email is being updated, check for duplicates
    if (email) {
      const existing = await queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL',
        [email, payload.userId]
      )
      if (existing) {
        return NextResponse.json(errorResponse('Email already in use'), { status: 409 })
      }
    }

    const updates: string[] = []
    const values: any[] = []

    if (name) { updates.push('name = ?'); values.push(name) }
    if (email) { updates.push('email = ?'); values.push(email) }

    updates.push('updated_at = NOW()')
    values.push(payload.userId)

    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)

    // Fetch updated user
    const updatedUser = await queryOne<any>(
      'SELECT id, name, email, role, mode FROM users WHERE id = ?',
      [payload.userId]
    )

    return NextResponse.json(successResponse(updatedUser, 'Profile updated successfully'))
  } catch (error) {
    console.error('[Profile Update] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
