import en from '../locales/en.json'
import ar from '../locales/ar.json'
import ku from '../locales/ku.json'

export type Language = 'ar' | 'en' | 'ku'
export type Direction = 'rtl' | 'ltr'

export const translations = { en, ar, ku }
export type TranslationKey = keyof typeof en

export type UserRole = 'admin' | 'store_owner' | 'user'
export type UserMode = 'controlled' | 'unlimited'

export type SubscriptionPlan = 'test' | 'starter' | 'pro' | 'business' | 'enterprise' | 'custom' | 'unlimited'

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'returned' | 'problematic'

export type BuyerRisk = 'low' | 'medium' | 'high'

export type MediaVisibility = 'public' | 'private' | 'restricted'

export type CustomFieldType = 'text' | 'number' | 'select' | 'multi-select' | 'boolean' | 'date'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  mode: UserMode
  createdAt: string
  isActive: boolean
}

// Product Type System - Dynamic Catalog
export interface ProductType {
  id: string
  storeId: string
  sku?: string | null
  name: string
  nameAr: string
  slug: string
  description: string
  customFields: CustomFieldDefinition[]
  createdAt: string
  isActive: boolean
}

export interface CustomFieldDefinition {
  id: string
  name: string
  nameAr: string
  type: CustomFieldType
  required: boolean
  options?: string[] // For select/multi-select
  defaultValue?: string | number | boolean
}

// Category System - Nested Tree
export interface Category {
  id: string
  storeId: string
  productTypeId: string
  parentId: string | null
  name: string
  nameAr: string
  slug: string
  sortOrder: number
  isActive: boolean
}

// Media with Privacy
export interface Media {
  id: string
  productId: string
  url: string
  type: 'image' | 'video'
  visibility: MediaVisibility
  blurHash?: string
  size: number
  metadata?: Record<string, string>
  createdAt: string
}

// Audit Log System
export interface AuditLog {
  id: string
  userId: string
  entityType: 'user' | 'store' | 'product' | 'order' | 'buyer' | 'subscription'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'status_change'
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface Subscription {
  id: string
  userId: string
  planId: SubscriptionPlan
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  isActive: boolean
  startDate: string
  endDate: string
  monthlyPrice: number
  yearlyPrice: number
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

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
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

export const PLAN_PRICES: Record<SubscriptionPlan, { monthly: number; yearly: number }> = {
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
  nameAr: string
  slug: string
  whatsappNumber?: string
  description: string
  descriptionAr: string
  logoUrl?: string | null
  coverUrl?: string | null
  isActive: boolean
  telegramUserId?: string
  telegramGroupId?: string
  telegramToken?: string
  telegramChatId?: string | null
  globalDiscount?: number
  globalDiscountEndDate?: string
  deliveryDays?: number
  productCount?: number
  storageUsage?: number
  defaultLanguage?: 'en' | 'ar' | 'ku'
  createdAt: string
  themeSettings?: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    fontFamily: string
    themeName: string
  }
  optionPresets?: Record<string, { name: string; nameAr?: string; nameKu?: string; values: string[]; type?: 'choice' | 'text' | 'multi-choice' | 'color'; swatches?: Record<string, string> }>
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
  nameAr?: string
  nameKu?: string
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
}

export interface Product {
  id: string
  storeId: string
  sku?: string
  productCode?: string
  title: string
  titleAr?: string
  titleKu?: string
  description: string
  descriptionAr?: string
  descriptionKu?: string
  price: number
  costPrice?: number
  discount?: number
  deliveryFee?: number
  needsDeposit?: boolean
  depositAmount?: number
  categoryId?: string
  productTypeId: string
  options: ProductOption[]
  variants: ProductVariant[]
  media: Array<{ id: string; url: string; type: 'image' | 'video' }>
  isActive: boolean
  averageRating?: number
  totalRatings?: number
  createdAt: string
  updatedAt?: string
  customData: any
}

export interface Buyer {
  id: string
  storeId: string
  name: string
  phone: string
  email?: string
  address?: string
  governorate?: string
  district?: string
  risk: BuyerRisk
  isBlacklisted: boolean
  totalOrders: number
  rejectedOrders: number
  createdAt: string
  updatedAt?: string
}

export interface OrderItem {
  id: string
  productId: string
  variantId?: string
  quantity: number
  price: number
  product?: Product
}

export interface Order {
  id: string
  orderGroupId: string
  storeId: string
  buyerId: string
  status: OrderStatus
  totalAmount: number
  deliveryFee: number
  shippingAddress?: string
  notes?: string
  items: OrderItem[]
  buyer?: Buyer
  store?: Store
  createdAt: string
}
