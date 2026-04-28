/**
 * JWT Authentication Utilities
 *
 * Uses the `jose` library for standards-compliant JWT (HMAC-SHA256).
 */

import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET_RAW = process.env.JWT_SECRET || 'storify-secret-key-change-in-production'
const secret = new TextEncoder().encode(JWT_SECRET_RAW)

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '30d'

export interface TokenPayload {
  userId: number
  email: string
  role: string
  mode: string
  type: 'access' | 'refresh'
}

export async function generateAccessToken(user: {
  id: number
  email: string
  role: string
  mode: string
}): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    mode: user.mode,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer('storify')
    .sign(secret)
}

export async function generateRefreshToken(user: {
  id: number
  email: string
  role: string
  mode: string
}): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    mode: user.mode,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuer('storify')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'storify' })
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

// API Response helpers
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message }
}

export function errorResponse(error: string): ApiResponse {
  return { success: false, error }
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
