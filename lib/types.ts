import en from '../locales/en/common.json'
import ar from '../locales/ar/common.json'
import ku from '../locales/ku/common.json'

export type Language = 'ar' | 'en' | 'ku'
export type Direction = 'rtl' | 'ltr'

export const translations = { en, ar, ku }
export type TranslationKey = keyof typeof en

export type UserRole = 'admin' | 'store_owner' | 'employee' | 'user'
export type UserMode = 'controlled' | 'unlimited'

export type SubscriptionPlan = 'test' | 'starter' | 'pro' | 'business' | 'enterprise' | 'custom' | 'unlimited'

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'returned' | 'problematic'

export type BuyerRisk = 'low' | 'medium' | 'high' | 'normal' | 'warning' | 'high_risk'

export type MediaVisibility = 'public' | 'private' | 'restricted'

export type CustomFieldType = 'text' | 'number' | 'select' | 'multi-select' | 'boolean' | 'date'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  mode: UserMode
  status?: string
  parentId?: string | null
  subscriptionPlan?: string | number | null
  subscription_plan?: string | number | null
  createdAt: string
  isActive: boolean
  subscription?: Subscription | null
  userLimit?: UserLimit | null
}

export interface UserLimit {
  limits: {
    max_stores?: number
    max_products?: number
    max_employees?: number
    storage_gb?: number
    telegram_bots?: number
    integrations_count?: number
    custom_domains?: number
  }
  pricing: {
    price_per_store?: number
    price_per_product?: number
    price_per_employee?: number
    price_per_storage_gb?: number
    price_per_telegram_bot?: number
    price_per_integration?: number
    price_per_custom_domain?: number
  }
  basePriceCents: number
  totalPriceCents: number
  currency: string
}

// Product Type System - Dynamic Catalog
export interface ProductType {
  id: string
  storeId: string | null
  sku?: string | null
  name: string
  slug?: string
  description?: string
  customFields?: CustomFieldDefinition[]
  createdAt?: string
  isActive: boolean
}

export interface CustomFieldDefinition {
  id: string
  name: string
  type: CustomFieldType
  required: boolean
  options?: string[] // For select/multi-select
  defaultValue?: string | number | boolean
}

// Category System - Nested Tree
export interface Category {
  id: string
  storeId?: string | null
  productTypeId: string | null
  parentId: string | null
  name: string
  slug: string
  sortOrder?: number
  isActive: boolean
  productsCount?: number
}

// Media with Privacy
export interface Media {
  id: string
  productId?: string | null
  url: string
  type: 'image' | 'video'
  isMain?: boolean
  visibility?: MediaVisibility
  blurHash?: string
  size?: number
  metadata?: Record<string, string>
  createdAt?: string
}

// Audit Log System
export interface AuditLog {
  id: string
  userId: string
  orderId?: string
  performedBy?: string
  performedAt?: string
  entityType: 'user' | 'store' | 'product' | 'order' | 'buyer' | 'subscription'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'status_change'
  previousValue?: Record<string, unknown> | string
  newValue?: Record<string, unknown> | string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export type OrderAuditLog = AuditLog

export interface Subscription {
  id: string
  userId: string
  planId: string | number
  planCode?: SubscriptionPlan | string
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
  isActive: boolean
  startsAt?: string
  startDate?: string
  endsAt?: string
  endDate?: string
  trialEndsAt?: string
  canceledAt?: string
  monthlyPrice: number
  yearlyPrice?: number
  metadata?: any
  plan?: {
    id: number | string
    name: string
    code: string
    price: number
    billingModel?: 'fixed' | 'usage' | 'hybrid' | string
    basePriceCents?: number
    currency?: string
    interval?: string
    features?: any[]
  }
  createdAt?: string
  updatedAt?: string
}

export interface PlanLimits {
  stores: number
  productsPerStore: number
  storage: number // in GB
  mediaTypes: ('images' | 'videos')[]
  ratings: boolean
  discounts: boolean
  advancedDiscounts: boolean
  telegramGroup: boolean
  riskDetection: boolean
  exports: boolean
  analytics: boolean
  apiAccess: boolean
  auditLogs: boolean
  prioritySupport: boolean
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  unlimited: {
    stores: Infinity,
    productsPerStore: Infinity,
    storage: Infinity,
    mediaTypes: ['images', 'videos'],
    ratings: true,
    discounts: true,
    advancedDiscounts: true,
    telegramGroup: true,
    riskDetection: true,
    exports: true,
    analytics: true,
    apiAccess: true,
    auditLogs: true,
    prioritySupport: true,
  },
  test: {
    stores: 1,
    productsPerStore: 10,
    storage: 1,
    mediaTypes: ['images'],
    ratings: false,
    discounts: false,
    advancedDiscounts: false,
    telegramGroup: false,
    riskDetection: false,
    exports: false,
    analytics: false,
    apiAccess: false,
    auditLogs: false,
    prioritySupport: false,
  },
  starter: {
    stores: 1,
    productsPerStore: 50,
    storage: 5,
    mediaTypes: ['images'],
    ratings: false,
    discounts: false,
    advancedDiscounts: false,
    telegramGroup: false,
    riskDetection: false,
    exports: false,
    analytics: false,
    apiAccess: false,
    auditLogs: false,
    prioritySupport: false,
  },
  pro: {
    stores: 3,
    productsPerStore: 300,
    storage: 20,
    mediaTypes: ['images', 'videos'],
    ratings: true,
    discounts: true,
    advancedDiscounts: false,
    telegramGroup: true,
    riskDetection: true,
    exports: true,
    analytics: false,
    apiAccess: false,
    auditLogs: false,
    prioritySupport: false,
  },
  business: {
    stores: 10,
    productsPerStore: Infinity,
    storage: 100,
    mediaTypes: ['images', 'videos'],
    ratings: true,
    discounts: true,
    advancedDiscounts: true,
    telegramGroup: true,
    riskDetection: true,
    exports: true,
    analytics: true,
    apiAccess: true,
    auditLogs: true,
    prioritySupport: true,
  },
  enterprise: {
    stores: Infinity,
    productsPerStore: Infinity,
    storage: Infinity,
    mediaTypes: ['images', 'videos'],
    ratings: true,
    discounts: true,
    advancedDiscounts: true,
    telegramGroup: true,
    riskDetection: true,
    exports: true,
    analytics: true,
    apiAccess: true,
    auditLogs: true,
    prioritySupport: true,
  },
  custom: {
    stores: 10,
    productsPerStore: Infinity,
    storage: 50,
    mediaTypes: ['images', 'videos'],
    ratings: true,
    discounts: true,
    advancedDiscounts: true,
    telegramGroup: true,
    riskDetection: true,
    exports: true,
    analytics: true,
    apiAccess: true,
    auditLogs: true,
    prioritySupport: true,
  },
}

export const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  test: { monthly: 0, yearly: 0 },
  starter: { monthly: 10, yearly: 100 },
  pro: { monthly: 25, yearly: 250 },
  business: { monthly: 50, yearly: 500 },
  enterprise: { monthly: 0, yearly: 0 }, // Custom pricing
  custom: { monthly: 0, yearly: 0 }, // Dynamic pricing
  unlimited: { monthly: 0, yearly: 0 },
}

export interface Upsell {
  id: string
  userId: string
  type: 'extra_store' | 'extra_storage' | 'white_label' | 'analytics_pack' | 'fast_deletion' | 'priority_alerts'
  value?: number // For storage increments
  expiresAt: string
}

export interface Store {
  id: string
  userId: string
  name: string
  slug: string
  subdomain?: string | null
  customDomain?: string | null
  domainVerifiedAt?: string | null
  domainStatus?: 'verified' | 'pending' | null
  whatsappNumber?: string
  description: string
  logoUrl?: string | null
  coverUrl?: string | null
  facebookUrl?: string | null
  instagramUrl?: string | null
  tiktokUrl?: string | null
  youtubeUrl?: string | null
  twitterUrl?: string | null
  telegramUrl?: string | null
  snapchatUrl?: string | null
  websiteUrl?: string | null
  isActive: boolean
  telegramUserId?: string
  telegramGroupId?: string
  telegramChatId?: string | null
  globalDiscount?: number
  globalDiscountEndDate?: string
  deliveryDays?: number
  productCount?: number
  storageUsage?: number
  telegramChannelId?: string
  telegramAutoPost?: boolean
  defaultLanguage?: 'en' | 'ar' | 'ku'
  createdAt: string
  themeSettings?: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    fontFamily: string
    themeName: string
  }
  optionPresets?: Record<string, { name: string; values: string[]; type?: 'choice' | 'text' | 'multi-choice' | 'color'; swatches?: Record<string, string> }>
  notificationSettings?: {
    newOrders: boolean
    orderConfirmations: boolean
    statusChanges: boolean
    riskAlerts: boolean
    notificationMethod: 'telegram' | 'whatsapp' | 'both'
  }
}

export interface ProductOption {
  id: string
  name: string
  values: string[]
  type?: 'choice' | 'text' | 'multi-choice' | 'color'
  swatches?: Record<string, string>
}

export interface ProductVariant {
  id: string
  sku?: string
  priceOverride?: number
  stockQuantity: number
  optionValues: Record<string, string>
  imageId?: string
  isActive?: boolean
}

export interface Product {
  id: string
  storeId: string
  sku?: string
  productCode?: string
  title: string
  description: string
  price: number
  costPrice?: number
  discount?: number
  deliveryFee?: number
  needsDeposit?: boolean
  depositAmount?: number
  categoryId?: string | null
  productTypeId?: string | null
  options: ProductOption[]
  variants: ProductVariant[]
  media: Array<{ id: string; url: string; type: 'image' | 'video'; isMain?: boolean }>
  isActive: boolean
  averageRating?: number
  totalRatings?: number
  createdAt: string
  updatedAt?: string
  customData?: any
}

export interface Buyer {
  id: string
  storeId?: string
  name: string
  phone: string
  email?: string
  address?: string
  governorate?: string
  district?: string
  landmark?: string
  risk?: BuyerRisk
  riskLevel?: BuyerRisk
  riskScore?: BuyerRisk
  rejectionCount?: number
  totalRejections?: number
  isBlacklisted: boolean
  totalOrders: number
  rejectedOrders: number
  createdAt: string
  updatedAt?: string
}

export interface OrderItem {
  id: string
  orderId?: string
  productId: string
  variantId?: string
  quantity: number
  price: number
  unitPrice?: number
  totalPrice?: number
  subtotal?: number
  product?: Product
}

export interface Order {
  id: string
  orderGroupId?: string | null
  storeId: string
  buyerId: string | null
  globalCustomerId?: string | null
  status: OrderStatus
  totalAmount: number
  totalPrice: number
  deliveryFee: number
  shippingAddress?: string
  notes?: string
  items: OrderItem[]
  buyer?: Buyer
  customer?: {
    name?: string | null
    phone?: string | null
    riskLevel?: BuyerRisk
    rejectionCount?: number
    totalOrders?: number
  }
  store?: Store
  createdAt: string
  updatedAt?: string
  alwaseet?: {
    orderId?: string
    qrLink?: string
    cityId?: number
    regionId?: number
    addressDetails?: string
    packageSizeId?: number
    itemsDescription?: string
    orderNotes?: string
    codAmount?: number
    status?: string
    syncedAt?: string
    syncStatus?: 'pending' | 'sent' | 'failed'
  }
}
