import bcrypt from 'bcryptjs'

/**
 * Production-grade password hashing utilities using bcrypt.
 * SALT_ROUNDS of 12 provides a strong balance between security and performance.
 */

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) return false
  return bcrypt.compare(password, hash)
}

export function generateSecureToken(length = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateApiKey(): string {
  const prefix = 'sk_live_'
  return prefix + generateSecureToken(24)
}

/**
 * Validate password strength
 * Requires: min 8 chars, uppercase, lowercase, number
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) errors.push('Must be at least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Must contain number')

  return { valid: errors.length === 0, errors }
}
