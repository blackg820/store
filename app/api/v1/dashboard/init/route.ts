import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const isAdmin = payload.role === 'admin'
    const userId = payload.userId

    // Basic data that everyone needs
    const [stores, productTypes, categories, settingsRes] = await Promise.all([
      isAdmin 
        ? query(`
            SELECT s.*, 
                   (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.deleted_at IS NULL) as product_count,
                   (SELECT COALESCE(SUM(file_size), 0) FROM media m WHERE m.store_id = s.id AND m.deleted_at IS NULL) as storage_usage
            FROM stores s 
            WHERE s.deleted_at IS NULL 
            ORDER BY s.created_at DESC LIMIT 100
          `)
        : query(`
            SELECT s.*, 
                   (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.deleted_at IS NULL) as product_count,
                   (SELECT COALESCE(SUM(file_size), 0) FROM media m WHERE m.store_id = s.id AND m.deleted_at IS NULL) as storage_usage
            FROM stores s 
            WHERE s.user_id = ? AND s.deleted_at IS NULL 
            ORDER BY s.created_at DESC LIMIT 100
          `, [userId]),
      isAdmin
        ? query('SELECT * FROM product_types WHERE deleted_at IS NULL')
        : query('SELECT pt.* FROM product_types pt JOIN stores s ON pt.store_id = s.id WHERE s.user_id = ? AND pt.deleted_at IS NULL', [userId]),
      isAdmin
        ? query('SELECT * FROM categories WHERE deleted_at IS NULL')
        : query('SELECT c.* FROM categories c JOIN product_types pt ON c.product_type_id = pt.id JOIN stores s ON pt.store_id = s.id WHERE s.user_id = ? AND c.deleted_at IS NULL', [userId]),
      query('SELECT setting_key, setting_value FROM global_settings')
    ])

    const settingsObj: Record<string, string> = {}
    if (Array.isArray(settingsRes)) {
      settingsRes.forEach((r: any) => { settingsObj[r.setting_key] = r.setting_value })
    }

    // Conditional data
    let products: any[] = []
    let orders: any[] = []
    let buyers: any[] = []
    let subscriptions: any[] = []
    let users: any[] = []
    let auditLogs: any[] = []

    if (isAdmin) {
      const adminData = await Promise.all([
        query(`
          SELECT p.*,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.id, 'url', m.url, 'type', m.type)) 
           FROM media m WHERE m.product_id = p.id AND m.deleted_at IS NULL) as media
          FROM products p 
          WHERE p.deleted_at IS NULL 
          ORDER BY p.created_at DESC LIMIT 100
        `),
        query(`SELECT o.*, s.name as store_name, b.name as buyer_name 
               FROM orders o 
               JOIN stores s ON o.store_id = s.id 
               JOIN buyers b ON o.buyer_id = b.id 
               WHERE o.deleted_at IS NULL 
               ORDER BY o.created_at DESC LIMIT 100`),
        query('SELECT * FROM buyers ORDER BY created_at DESC LIMIT 100'),
        query('SELECT * FROM subscriptions'),
        query('SELECT id, name, email, role, status, created_at FROM users'),
        query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
      ])
      products = adminData[0]
      orders = adminData[1]
      buyers = adminData[2]
      users = adminData[4]
      auditLogs = adminData[5]
      subscriptions = await query(`
        SELECT sub.*, p.price as monthly_price, u.name as user_name, u.email as user_email
        FROM subscriptions sub 
        LEFT JOIN plans p ON sub.plan_code = p.code
        JOIN users u ON sub.user_id = u.id
      `)
    } else {
      const userData = await Promise.all([
        query(`SELECT p.*,
               (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.id, 'url', m.url, 'type', m.type)) 
                FROM media m WHERE m.product_id = p.id AND m.deleted_at IS NULL) as media
               FROM products p 
               JOIN stores s ON p.store_id = s.id 
               WHERE s.user_id = ? AND p.deleted_at IS NULL 
               ORDER BY p.created_at DESC LIMIT 100`, [userId]),
        query(`SELECT o.*, s.name as store_name, b.name as buyer_name 
               FROM orders o 
               JOIN stores s ON o.store_id = s.id 
               JOIN buyers b ON o.buyer_id = b.id 
               WHERE s.user_id = ? AND o.deleted_at IS NULL 
               ORDER BY o.created_at DESC LIMIT 100`, [userId]),
        query(`SELECT DISTINCT b.* FROM buyers b 
               JOIN orders o ON b.id = o.buyer_id 
               JOIN stores s ON o.store_id = s.id 
               WHERE s.user_id = ? 
               ORDER BY b.created_at DESC LIMIT 100`, [userId]),
        query(`SELECT sub.*, p.price as monthly_price, u.name as user_name, u.email as user_email
               FROM subscriptions sub 
               LEFT JOIN plans p ON sub.plan_code = p.code
               JOIN users u ON sub.user_id = u.id
               WHERE sub.user_id = ?`, [userId])
      ])
      products = userData[0]
      orders = userData[1]
      buyers = userData[2]
      subscriptions = userData[3]
    }

    const safeParse = (str: any, fallback: any = {}) => {
      if (!str) return fallback
      if (typeof str !== 'string') return str
      try {
        return JSON.parse(str)
      } catch (e) {
        console.error('[Dashboard Init] Parse error:', e)
        return fallback
      }
    }

    return NextResponse.json(successResponse({
      stores: stores.map((s: any) => ({
        id: String(s.id),
        userId: String(s.user_id),
        name: s.name || '',
        nameAr: s.name_ar || s.name || '',
        slug: s.slug || '',
        whatsappNumber: s.whatsapp_number || '',
        description: s.description || '',
        descriptionAr: s.description_ar || '',
        logoUrl: s.logo_url || null,
        coverUrl: s.cover_url || null,
        deliveryDays: s.delivery_time || 3,
        telegramToken: s.telegram_token || '',
        telegramChatId: s.telegram_chat_id || '',
        telegramUserId: s.telegram_user_id || '',
        telegramGroupId: s.telegram_group_id || '',
        themeSettings: safeParse(s.theme_settings, {
          primaryColor: '#2563eb',
          accentColor: '#3b82f6',
          backgroundColor: '#ffffff',
          fontFamily: 'Inter',
          themeName: 'Default'
        }),
        notificationSettings: safeParse(s.notification_settings, {
          newOrders: true,
          orderConfirmations: true,
          statusChanges: true,
          riskAlerts: true,
          notificationMethod: 'telegram'
        }),
        optionPresets: safeParse(s.option_presets, {}),
        isActive: s.status === 'active',
        productCount: Number(s.product_count || 0),
        storageUsage: Number(s.storage_usage || 0),
        createdAt: s.created_at || new Date().toISOString(),
      })),
      products: products.map((p: any) => ({
        id: String(p.id),
        storeId: String(p.store_id),
        productTypeId: String(p.product_type_id),
        categoryId: p.category_id ? String(p.category_id) : null,
        sku: p.sku || '',
        title: p.title || '',
        titleAr: p.title_ar || p.title || '',
        titleKu: p.title_ku || p.title || '',
        description: p.description || '',
        descriptionAr: p.description_ar || '',
        descriptionKu: p.description_ku || '',
        price: Number(p.price || 0),
        costPrice: Number(p.cost_price || 0),
        discount: Number(p.discount || 0),
        deliveryFee: Number(p.delivery_fee || 0),
        needsDeposit: p.needs_deposit === 1,
        depositAmount: Number(p.deposit_amount || 0),
        isActive: p.is_active === 1 || p.status === 'active',
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString(),
        customData: safeParse(p.custom_data, {}),
        media: safeParse(p.media, []) 
      })),
      orders: orders.map((o: any) => ({
        id: String(o.id),
        storeId: String(o.store_id),
        buyerId: String(o.buyer_id),
        status: o.status || 'pending',
        totalAmount: Number(o.total_amount || 0),
        deliveryFee: Number(o.delivery_fee || 0),
        notes: o.internal_notes || '',
        createdAt: o.created_at || new Date().toISOString(),
        store: { name: o.store_name || 'Store' },
        buyer: { name: o.buyer_name || 'Buyer' },
        items: [] 
      })),
      buyers: buyers.map((b: any) => ({
        id: String(b.id),
        name: b.name || '',
        phone: b.phone || '',
        email: b.email || '',
        risk: b.risk_level || 'low',
        isBlacklisted: b.is_blacklisted === 1,
        totalOrders: Number(b.total_orders || 0),
        createdAt: b.created_at || new Date().toISOString()
      })),
      subscriptions: (subscriptions || []).map((s: any) => ({
        id: String(s.id),
        userId: String(s.user_id),
        planId: s.plan_code || 'test',
        status: s.status || 'active',
        monthlyPrice: Number(s.monthly_price || 0),
        userName: s.user_name || 'Unknown',
        userEmail: s.user_email || '',
        startDate: s.current_period_start || new Date().toISOString(),
        endDate: s.current_period_end || new Date().toISOString(),
        isActive: s.status === 'active'
      })),
      productTypes: (productTypes || []).map((pt: any) => ({
        id: String(pt.id),
        storeId: String(pt.store_id),
        name: pt.name || '',
        nameAr: pt.name_ar || pt.name || '',
        slug: pt.slug || '',
        customFields: safeParse(pt.schema, []),
        isActive: pt.is_active === 1
      })),
      categories: (categories || []).map((c: any) => ({
        id: String(c.id),
        productTypeId: String(c.product_type_id),
        parentId: c.parent_id ? String(c.parent_id) : null,
        name: c.name || '',
        nameAr: c.name_ar || c.name || '',
        slug: c.slug || '',
        isActive: c.is_active === 1
      })),
      settings: settingsObj,
      users: (users || []).map((u: any) => ({
        id: String(u.id),
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'user',
        status: u.status || 'active',
        isActive: u.status === 'active',
        createdAt: u.created_at || new Date().toISOString()
      })),
      auditLogs: (auditLogs || []).map((a: any) => ({
        id: String(a.id),
        userId: String(a.user_id),
        entityType: a.entity_type,
        entityId: String(a.entity_id),
        action: a.action,
        createdAt: a.created_at || new Date().toISOString()
      }))
    }))

  } catch (error) {
    console.error('[Dashboard Init] Error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
