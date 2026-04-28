import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { generateAccessToken, generateRefreshToken, successResponse, errorResponse } from '@/lib/jwt'
import { verifyPassword } from '@/lib/password'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { getTranslations } from '@/lib/i18n-server'

interface DBUser {
  id: number
  email: string
  password: string
  name: string
  role: 'admin' | 'user'
  mode: 'controlled' | 'unlimited'
  status: 'active' | 'suspended'
}

export async function POST(request: NextRequest) {
  try {
    const { t } = getTranslations(request)
    
    // Rate limit login attempts
    const identifier = getClientIdentifier(request)
    const rl = checkRateLimit(`auth:${identifier}`, RATE_LIMITS.auth)
    if (!rl.allowed) {
      return NextResponse.json(
        errorResponse(t('tooManyAttempts')),
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        errorResponse(t('emailPasswordRequired')),
        { status: 400 }
      )
    }

    // Query user from database
    const user = await queryOne<DBUser>(
      'SELECT id, email, password, name, role, mode, status FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [email]
    )

    if (!user) {
      return NextResponse.json(
        errorResponse(t('invalidCredentials')),
        { status: 401 }
      )
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        errorResponse(t('accountSuspended')),
        { status: 403 }
      )
    }

    // Verify password with bcrypt
    const validPassword = await verifyPassword(password, user.password)
    if (!validPassword) {
      return NextResponse.json(
        errorResponse(t('invalidCredentials')),
        { status: 401 }
      )
    }

    // Map DB role to app role
    const appRole = user.role === 'admin' ? 'admin' : 'store_owner'

    const tokenUser = {
      id: user.id,
      email: user.email,
      role: appRole,
      mode: user.mode,
    }

    const accessToken = await generateAccessToken(tokenUser)
    const refreshToken = await generateRefreshToken(tokenUser)

    // Update last login
    await queryOne('UPDATE users SET updated_at = NOW() WHERE id = ?', [user.id])

    return NextResponse.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: appRole,
          mode: user.mode,
        },
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
      }, t('success'))
    )
  } catch (error) {
    console.error('[Auth] Login error:', error)
    const { t } = getTranslations(request)
    return NextResponse.json(
      errorResponse(t('internalServerError')),
      { status: 500 }
    )
  }
}
