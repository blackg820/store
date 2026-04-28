import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, insert } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse, paginatedResponse } from '@/lib/jwt'
import { checkStoreLimit } from '@/lib/subscription-utils'
import { getServerTranslations, getTranslations } from '@/lib/i18n-server'

interface DBStore {
  id: number
  user_id: number
  name: string
  name_ar: string
  slug: string
  description: string
  description_ar: string | null
  logo_url: string | null
  cover_url: string | null
  status: string
  base_currency: string
  base_language: string
  delivery_time: number
  telegram_token: string | null
  telegram_user_id: string | null
  telegram_group_id: string | null
  telegram_chat_id: string | null
  theme_settings: string | null
  notification_settings: string | null
  whatsapp_number: string | null
  product_count?: number
  storage_usage?: number
  created_at: string
  updated_at: string
}

// GET /api/v1/stores
export async function GET(request: NextRequest) {
  try {
    const { t } = getTranslations(request)

    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) {
      return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') {
      return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    let countSql = 'SELECT COUNT(*) as total FROM stores WHERE deleted_at IS NULL'
    let dataSql = `
      SELECT s.*, 
             (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.deleted_at IS NULL) as product_count,
             (SELECT COALESCE(SUM(file_size), 0) FROM media m WHERE m.store_id = s.id AND m.deleted_at IS NULL) as storage_usage
      FROM stores s 
      WHERE s.deleted_at IS NULL
    `
    const params: unknown[] = []

    // Tenant isolation
    if (payload.role !== 'admin') {
      countSql += ' AND user_id = ?'
      dataSql += ' AND s.user_id = ?'
      params.push(payload.userId)
    }

    if (search) {
      countSql += ' AND (name LIKE ? OR slug LIKE ?)'
      dataSql += ' AND (s.name LIKE ? OR s.slug LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    dataSql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?'

    const countResult = await query<{ total: number }>(countSql, params)
    const total = countResult[0]?.total || 0

    const stores = await query<DBStore>(dataSql, [...params, limit, offset])

    // Map to API shape
    const mapped = stores.map(s => ({
      id: String(s.id),
      userId: String(s.user_id),
      name: s.name,
      nameAr: s.name_ar || s.name,
      slug: s.slug,
      whatsappNumber: s.whatsapp_number || '',
      description: s.description || '',
      descriptionAr: s.description_ar || '',
      logoUrl: s.logo_url || null,
      coverUrl: s.cover_url || null,
      deliveryDays: s.delivery_time || 3,
      telegramToken: s.telegram_token || '',
      telegramUserId: s.telegram_user_id || '',
      telegramGroupId: s.telegram_group_id || '',
      telegramChatId: s.telegram_chat_id || '',
      themeSettings: typeof s.theme_settings === 'string' ? JSON.parse(s.theme_settings) : s.theme_settings,
      notificationSettings: typeof s.notification_settings === 'string' ? JSON.parse(s.notification_settings) : (s.notification_settings || {
        newOrders: true,
        orderConfirmations: true,
        statusChanges: true,
        riskAlerts: true
      }),
      isActive: s.status === 'active',
      productCount: s.product_count || 0,
      storageUsage: s.storage_usage || 0,
      createdAt: s.created_at,
    }))

    return NextResponse.json(paginatedResponse(mapped, page, limit, total))
  } catch (error) {
    console.error('[Stores] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// POST /api/v1/stores
export async function POST(request: NextRequest) {
  try {
    const { t } = getTranslations(request)

    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) {
      return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') {
      return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })
    }

    const body = await request.json()
    const { name, nameAr, slug, whatsappNumber, description, descriptionAr, logoUrl, coverUrl, deliveryDays, telegramToken, telegramUserId, telegramGroupId, telegramChatId, themeSettings, notificationSettings } = body

    if (!name || !slug) {
      return NextResponse.json(errorResponse(t('nameSlugRequired')), { status: 400 })
    }

    // Check plan limits
    const limitCheck = await checkStoreLimit(Number(payload.userId))
    if (!limitCheck.allowed) {
      const errorMessage = limitCheck.errorKey 
        ? t(limitCheck.errorKey as any, limitCheck.errorData)
        : (limitCheck.error || t('planLimitReached'))

      return NextResponse.json(errorResponse(errorMessage), { status: 403 })
    }

    // Check slug uniqueness
    const existing = await queryOne('SELECT id FROM stores WHERE slug = ? AND deleted_at IS NULL', [slug])
    if (existing) {
      return NextResponse.json(errorResponse(t('slugExists')), { status: 409 })
    }


    const newId = await insert(
      'INSERT INTO stores (user_id, name, name_ar, slug, whatsapp_number, description, description_ar, logo_url, cover_url, status, base_currency, base_language, delivery_time, telegram_token, telegram_user_id, telegram_group_id, telegram_chat_id, theme_settings, notification_settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [payload.userId, name, nameAr || name, slug, whatsappNumber || null, description || '', descriptionAr || description || '', logoUrl || null, coverUrl || null, 'active', 'IQD', 'ar', deliveryDays || 3, telegramToken || null, telegramUserId || null, telegramGroupId || null, telegramChatId || null, themeSettings ? JSON.stringify(themeSettings) : null, notificationSettings ? JSON.stringify(notificationSettings) : JSON.stringify({ newOrders: true, orderConfirmations: true, statusChanges: true, riskAlerts: true })]
    )

    return NextResponse.json(
      successResponse({
        id: String(newId),
        userId: String(payload.userId),
        name,
        nameAr: nameAr || name,
        slug,
        description: description || '',
        isActive: true,
        createdAt: new Date().toISOString(),
      }, 'Store created successfully'),
      { status: 201 }
    )
  } catch (error) {
    console.error('[Stores] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
