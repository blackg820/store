import { queryOne, query } from './db'

export interface PlanLimit {
  max_stores: number
  max_products: number
  max_storage_gb: number
  can_use_video: boolean
  can_use_discounts: boolean
  can_use_ratings: boolean
  can_use_telegram_group: boolean
  [key: string]: any
}

export interface UserSubscription {
  id: number
  userId: number
  planId: number
  planCode: string
  planName: string
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired' | 'suspended'
  startDate: string
  endDate: string
  limits: PlanLimit
}

const GRACE_PERIOD_DAYS = 3 // Standard SaaS grace period

/**
 * Get active subscription for a user with all its limits
 */
export async function getUserSubscription(userId: number): Promise<UserSubscription | null> {
  // SaaS Owner Bypass
  const user = await queryOne<{ role: string }>('SELECT role FROM users WHERE id = ?', [userId])
  if (user?.role === 'admin') {
    return {
      id: 0,
      userId,
      planId: 0,
      planCode: 'unlimited',
      planName: 'Platform Administrator',
      status: 'active',
      startDate: new Date(2000, 0, 1).toISOString(),
      endDate: new Date(2099, 11, 31).toISOString(),
      limits: {
        max_stores: -1,
        max_products: -1,
        max_storage_gb: -1,
        can_use_video: true,
        can_use_discounts: true,
        can_use_ratings: true,
        can_use_telegram_group: true,
        can_use_risk_detection: true,
        can_use_exports: true,
        can_use_analytics: true,
        can_use_api: true,
        can_use_audit_logs: true
      }
    }
  }

  const sql = `
    SELECT s.*, p.code as plan_code, p.name as plan_name, 
           p.storage_gb, p.stores_limit, p.products_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = ? AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY s.created_at DESC LIMIT 1
  `
  const sub = await queryOne<any>(sql, [userId])
  
  if (!sub) return null

  // Check if expired (absolute end date + grace period)
  const now = new Date()
  const endDate = sub.current_period_end ? new Date(sub.current_period_end) : null
  
  if (endDate) {
    const graceEndDate = new Date(endDate)
    graceEndDate.setDate(graceEndDate.getDate() + GRACE_PERIOD_DAYS)

    if (now > graceEndDate) {
      // Auto-expire
      await query('UPDATE subscriptions SET status = "expired" WHERE id = ?', [sub.id])
      return null
    }

    // If within grace period but past end date, mark as past_due if it was active
    if (now > endDate && sub.status === 'active') {
      await query('UPDATE subscriptions SET status = "past_due" WHERE id = ?', [sub.id])
      sub.status = 'past_due'
    }
  }

  // Fetch limits
  const limitRows = await query<any>('SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = ?', [sub.plan_id])
  const limits: any = {}
  limitRows.forEach(row => {
    const key = row.limit_key
    const val = row.limit_value
    
    // Boolean features
    if (key.startsWith('can_use_') || key.startsWith('has_')) {
      limits[key] = val === '1' || val === 'true'
    } 
    // Numeric limits
    else if (!isNaN(Number(val))) {
      limits[key] = Number(val)
    } 
    // String values
    else {
      limits[key] = val
    }
  })
  
  // Merge basic limits from plans table (these take precedence or act as defaults)
  if (sub.storage_gb !== undefined) limits.max_storage_gb = sub.storage_gb
  if (sub.stores_limit !== undefined) limits.max_stores = sub.stores_limit
  if (sub.products_limit !== undefined) limits.max_products = sub.products_limit

  return {
    id: sub.id,
    userId: sub.user_id,
    planId: sub.plan_id,
    planCode: sub.plan_code,
    planName: sub.plan_name,
    status: sub.status,
    startDate: sub.current_period_start,
    endDate: sub.current_period_end,
    limits: limits as PlanLimit
  }
}

/**
 * Check if user can perform an action based on a specific limit key
 */
export async function checkLimit(userId: number, key: keyof PlanLimit, currentCount?: number): Promise<{ allowed: boolean; error?: string; errorKey?: string; errorData?: any }> {
  const sub = await getUserSubscription(userId)
  
  if (!sub) {
    return { 
      allowed: false, 
      error: 'No active subscription found. Please subscribe to a plan to continue.',
      errorKey: 'noActiveSubscription'
    }
  }

  const limit = sub.limits[key]
  
  if (typeof limit === 'boolean') {
    if (!limit) {
      const featureName = (key as string).replace('can_use_', '').replace('_', ' ')
      return { 
        allowed: false, 
        error: `Feature "${featureName}" is not available in your ${sub.planName} plan. Please upgrade to use it.`,
        errorKey: 'planFeatureDisabled',
        errorData: { plan: sub.planName, feature: featureName }
      }
    }
    return { allowed: true }
  }

  if (typeof limit === 'number' && currentCount !== undefined) {
    if (limit === -1) return { allowed: true } // Unlimited
    if (currentCount >= limit) {
      const resourceName = (key as string).replace('max_', '').replace('_', ' ')
      const errorKey = key === 'max_stores' ? 'planLimitStores' : (key === 'max_products' ? 'planLimitProducts' : 'planLimitReached')
      
      return { 
        allowed: false, 
        error: `Limit reached. Your ${sub.planName} allows up to ${limit} ${resourceName}.`,
        errorKey,
        errorData: { plan: sub.planName, limit }
      }
    }
  }

  return { allowed: true }
}

export async function checkStoreLimit(userId: number): Promise<{ allowed: boolean; error?: string; errorKey?: string; errorData?: any }> {
  const count = await queryOne<{ total: number }>(
    'SELECT COUNT(*) as total FROM stores WHERE user_id = ? AND deleted_at IS NULL',
    [userId]
  )
  return checkLimit(userId, 'max_stores', count?.total || 0)
}

export async function checkProductLimit(storeId: number): Promise<{ allowed: boolean; error?: string; errorKey?: string; errorData?: any }> {
  const store = await queryOne<{ user_id: number }>('SELECT user_id FROM stores WHERE id = ?', [storeId])
  if (!store) return { allowed: false, error: 'Store not found' }
  
  const count = await queryOne<{ total: number }>(
    'SELECT COUNT(*) as total FROM products WHERE store_id = ? AND deleted_at IS NULL',
    [storeId]
  )
  return checkLimit(store.user_id, 'max_products', count?.total || 0)
}

/**
 * Helper for feature flags
 */
export async function userHasFeature(userId: number, feature: keyof PlanLimit): Promise<boolean> {
  const sub = await getUserSubscription(userId)
  if (!sub) return false
  return !!sub.limits[feature]
}
