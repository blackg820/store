import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/password'

// PATCH /api/v1/profile/password
export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(errorResponse('Current and new passwords are required'), { status: 400 })
    }

    // Validate new password strength
    const strength = validatePasswordStrength(newPassword)
    if (!strength.valid) {
      return NextResponse.json(errorResponse(strength.errors[0]), { status: 400 })
    }

    // Fetch user from DB to verify current password
    const user = await queryOne<{ password: string }>(
      'SELECT password FROM users WHERE id = ? AND deleted_at IS NULL',
      [payload.userId]
    )

    if (!user) {
      return NextResponse.json(errorResponse('User not found'), { status: 404 })
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json(errorResponse('Incorrect current password'), { status: 401 })
    }

    // Hash new password
    const hashed = await hashPassword(newPassword)

    // Update password
    await execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashed, payload.userId]
    )

    return NextResponse.json(successResponse(null, 'Password updated successfully'))
  } catch (error) {
    console.error('[Password Update] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
