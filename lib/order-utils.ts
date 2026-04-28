import type { Order, Buyer, BuyerRisk } from './types'

/**
 * Anti-duplicate order detection.
 * Blocks orders with same phone + same product within the defined time window.
 */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

export function isDuplicateOrder(
  orders: Order[],
  buyerId: string,
  productId: string,
  windowMs: number = DUPLICATE_WINDOW_MS
): boolean {
  const now = Date.now()
  return orders.some(
    (order) =>
      order.buyerId === buyerId &&
      order.items.some(i => i.productId === productId) &&
      now - new Date(order.createdAt).getTime() < windowMs &&
      order.status !== 'returned' &&
      order.status !== 'problematic'
  )
}

/**
 * Recalculate buyer risk score based on order history.
 * Low: <20% rejection rate, Medium: 20-50%, High: >50%
 */
export function calculateBuyerRisk(
  totalOrders: number,
  rejectedOrders: number
): BuyerRisk {
  if (totalOrders === 0) return 'low'
  const ratio = rejectedOrders / totalOrders
  if (ratio > 0.5) return 'high'
  if (ratio > 0.2) return 'medium'
  return 'low'
}

/**
 * Validate Iraq phone number format.
 * Accepts: +9647xxxxxxxx, 009647xxxxxxxx, 07xxxxxxxxx, 7xxxxxxxxx
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00964')) return `+964${digits.slice(5)}`
  if (digits.startsWith('964')) return `+${digits}`
  if (digits.startsWith('07')) return `+964${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('7')) return `+964${digits}`
  return `+${digits}`
}

export function validatePhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return /^\+9647[0-9]{9}$/.test(normalized)
}

/**
 * Validates dynamic custom fields against their definitions.
 */
export function validateCustomFields(definitions: any[], values: Record<string, any>): string[] {
  const errors: string[] = []
  
  if (!definitions || !Array.isArray(definitions)) return errors

  for (const field of definitions) {
    const value = values[field.name]

    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label || field.name} is required`)
      continue
    }

    if (value !== undefined && value !== null && value !== '') {
      if (field.type === 'number' && isNaN(Number(value))) {
        errors.push(`${field.label || field.name} must be a number`)
      }
      if (field.type === 'select' && field.options && !field.options.includes(value)) {
        errors.push(`Invalid option for ${field.label || field.name}`)
      }
    }
  }

  return errors
}

/**
 * Store ranking algorithm based on multiple factors.
 */
export interface StoreRankingMetrics {
  storeId: string
  totalOrders: number
  deliveredOrders: number
  revenue: number
  rejectionRate: number
  score: number
}

export function calculateStoreRanking(
  storeId: string,
  orders: any[],
  products: any[]
): StoreRankingMetrics {
  const storeOrders = orders.filter((o) => o.storeId === storeId)
  const delivered = storeOrders.filter((o) => o.status === 'delivered').length
  const rejected = storeOrders.filter(
    (o) => o.status === 'returned' || o.status === 'problematic'
  ).length
  const revenue = storeOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0)

  const rejectionRate = storeOrders.length > 0 ? rejected / storeOrders.length : 0
  const score = (delivered * 10) + (revenue / 1000) - (rejected * 5)

  return {
    storeId,
    totalOrders: storeOrders.length,
    deliveredOrders: delivered,
    revenue,
    rejectionRate,
    score,
  }
}
