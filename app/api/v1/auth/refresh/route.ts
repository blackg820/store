import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyToken, generateAccessToken, generateRefreshToken, successResponse, errorResponse } from '@/lib/jwt'

interface DBUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'user'
  mode: 'controlled' | 'unlimited'
  status: 'active' | 'suspended'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        errorResponse('Refresh token is required'),
        { status: 400 }
      )
    }

    const payload = await verifyToken(refreshToken)

    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        errorResponse('Invalid or expired refresh token'),
        { status: 401 }
      )
    }

    const user = await queryOne<DBUser>(
      'SELECT id, email, name, role, mode, status FROM users WHERE id = ? AND status = ? AND deleted_at IS NULL LIMIT 1',
      [payload.userId, 'active']
    )

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found or inactive'),
        { status: 401 }
      )
    }

    const appRole = user.role === 'admin' ? 'admin' : 'store_owner'
    const tokenUser = { id: user.id, email: user.email, role: appRole, mode: user.mode }

    const newAccessToken = await generateAccessToken(tokenUser)
    const newRefreshToken = await generateRefreshToken(tokenUser)

    return NextResponse.json(
      successResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60,
      }, 'Token refreshed successfully')
    )
  } catch (error) {
    console.error('[Auth] Refresh error:', error)
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    )
  }
}
