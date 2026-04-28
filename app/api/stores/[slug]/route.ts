import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/jwt'

// GET /api/stores/[slug] - Public store page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const store = await queryOne<any>(
      `SELECT s.id, s.name, s.name_ar, s.slug, s.whatsapp_number, s.status, s.base_currency, 
              s.logo_url, s.cover_url, s.theme_settings, s.delivery_time, s.created_at,
              u.mode as user_mode, u.role as user_role, u.status as user_account_status,
              sub.status as sub_status, sub.current_period_end as sub_end
       FROM stores s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN subscriptions sub ON u.id = sub.user_id
       WHERE s.slug = ? AND s.status = ? AND s.deleted_at IS NULL`,
      [slug, 'active']
    )

    if (!store) {
      return NextResponse.json(errorResponse('Store not found'), { status: 404 })
    }

    // 0. Get site name
    const siteNameSetting = await queryOne<any>(
      "SELECT setting_value FROM global_settings WHERE setting_key = 'site_name'"
    )
    const siteName = siteNameSetting?.setting_value || 'Storify'

    // Account Suspension Check
    if (store.user_account_status === 'suspended') {
      return NextResponse.json(errorResponse('This account has been suspended.'), { status: 403 })
    }

    // Subscription check
    if (store.user_mode === 'controlled' && store.user_role !== 'admin') {
      const now = new Date()
      const expiry = store.sub_end ? new Date(store.sub_end) : null
      
      if (store.sub_status !== 'active' || !expiry || expiry < now) {
        return NextResponse.json(errorResponse('Store subscription has expired. Please contact the owner.'), { status: 403 })
      }
    }

    // 1. Get products
    const products = await query<any>(
      `SELECT p.*, c.name as category_name, pt.name as product_type_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_types pt ON p.product_type_id = pt.id
       WHERE p.store_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`,
      [store.id]
    )

    // 2. Fetch media for these products
    const productIds = products.map((p: any) => p.id)
    const media = productIds.length > 0 ? await query<any>(
      `SELECT * FROM media WHERE product_id IN (${productIds.join(',')}) AND deleted_at IS NULL AND visibility = 'public'`
    ) : []

    // 3. Map to storefront shape
    const mappedProducts = products.map((p: any) => ({
      id: String(p.id),
      sku: p.sku || '',
      productCode: p.product_code || '',
      title: p.title,
      titleAr: p.title_ar || p.title,
      titleKu: p.title_ku || p.title,
      name: p.title,
      nameAr: p.title_ar || p.title,
      description: p.description || '',
      descriptionAr: p.description_ar || p.description || '',
      descriptionKu: p.description_ku || p.description || '',
      price: Number(p.price),
      discount: Number(p.discount || 0),
      deliveryFee: Number(p.delivery_fee || 0),
      media: [
        ...(p.custom_data ? (typeof p.custom_data === 'string' ? JSON.parse(p.custom_data) : p.custom_data)?.images || [] : []).map((url: string, idx: number) => ({
          id: `legacy-${idx}`,
          url,
          type: 'image'
        })),
        ...media.filter((m: any) => m.product_id === p.id).map((m: any) => ({
          id: String(m.id),
          url: m.url,
          type: m.type
        }))
      ],
      images: [
        ...(p.custom_data ? (typeof p.custom_data === 'string' ? JSON.parse(p.custom_data) : p.custom_data)?.images || [] : []),
        ...media.filter((m: any) => m.product_id === p.id && m.type === 'image').map((m: any) => m.url)
      ],
      videos: media.filter((m: any) => m.product_id === p.id && m.type === 'video').map((m: any) => m.url),
      rating: Number(p.rating || 0),
      ratingCount: p.rating_count || 0,
      category: p.category_name,
      productType: p.product_type_name
    }))

    return NextResponse.json(successResponse({
      store: {
        id: String(store.id),
        name: store.name,
        nameAr: store.name_ar || store.name,
        slug: store.slug,
        whatsappNumber: store.whatsapp_number || null,
        currency: store.base_currency,
        logoUrl: store.logo_url || null,
        coverUrl: store.cover_url || null,
        deliveryDays: Number(store.delivery_time || 3),
        themeSettings: typeof store.theme_settings === 'string' ? JSON.parse(store.theme_settings as string) : (store.theme_settings || null),
      },
      products: mappedProducts,
      siteName,
    }))
  } catch (error) {
    console.error('[Store] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
