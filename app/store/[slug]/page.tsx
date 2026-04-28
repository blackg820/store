import { query, queryOne } from '@/lib/db'
import { notFound } from 'next/navigation'
import { StorefrontClient } from '@/components/store/storefront-client'
import { translations } from '@/lib/types'
import { Metadata } from 'next'

// Fetch site name
async function getSiteName() {
  const siteNameSetting = await queryOne<any>(
    "SELECT setting_value FROM global_settings WHERE setting_key = 'site_name'"
  )
  return siteNameSetting?.setting_value || 'Storify'
}

// Fetch store and products
async function getStoreData(slug: string) {
  const store = await queryOne<any>(
    `SELECT s.id, s.name, s.name_ar, s.slug, s.whatsapp_number, s.status, s.base_currency, 
            s.logo_url, s.cover_url, s.theme_settings, s.delivery_time, s.description, s.description_ar,
            s.default_language,
            u.mode as user_mode, u.role as user_role, u.status as user_account_status,
            sub.status as sub_status, sub.current_period_end as sub_end
     FROM stores s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN subscriptions sub ON u.id = sub.user_id
     WHERE s.slug = ? AND s.status = ? AND s.deleted_at IS NULL`,
    [slug, 'active']
  )

  if (!store) return null

  // Account Suspension Check
  if (store.user_account_status === 'suspended') return null

  // Subscription check
  if (store.user_mode === 'controlled' && store.user_role !== 'admin') {
    const now = new Date()
    const expiry = store.sub_end ? new Date(store.sub_end) : null
    if (store.sub_status !== 'active' || !expiry || expiry < now) return null
  }

  const products = await query<any>(
    `SELECT p.*, c.name as category_name, pt.name as product_type_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN product_types pt ON p.product_type_id = pt.id
     WHERE p.store_id = ? AND p.deleted_at IS NULL
     ORDER BY p.created_at DESC`,
    [store.id]
  )

  const productIds = products.map((p: any) => p.id)
  const media = productIds.length > 0 ? await query<any>(
    `SELECT * FROM media WHERE product_id IN (${productIds.join(',')}) AND deleted_at IS NULL AND visibility = 'public'`
  ) : []

  const mappedProducts = products.map((p: any) => ({
    id: String(p.id),
    sku: p.sku || '',
    title: p.title,
    titleAr: p.title_ar || p.title,
    description: p.description || '',
    descriptionAr: p.description_ar || p.description || '',
    price: Number(p.price),
    discount: Number(p.discount || 0),
    deliveryFee: Number(p.delivery_fee || 0),
    media: [
      ...media.filter((m: any) => m.product_id === p.id).map((m: any) => ({
        id: String(m.id),
        url: m.url,
        type: m.type
      }))
    ],
    category: p.category_name,
    productType: p.product_type_name
  }))

  return {
    store: {
      id: String(store.id),
      name: store.name,
      nameAr: store.name_ar || store.name,
      slug: store.slug,
      whatsappNumber: store.whatsapp_number || null,
      description: store.description || '',
      descriptionAr: store.description_ar || store.description || '',
      currency: store.base_currency,
      logoUrl: store.logo_url || null,
      coverUrl: store.cover_url || null,
      defaultLanguage: store.default_language || 'ar',
      deliveryDays: Number(store.delivery_time || 3),
      themeSettings: typeof store.theme_settings === 'string' ? JSON.parse(store.theme_settings as string) : (store.theme_settings || null),
    },
    products: mappedProducts
  }
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const [data, siteName] = await Promise.all([
    getStoreData(params.slug),
    getSiteName()
  ])
  
  if (!data) return { title: 'Store Not Found' }
  
  const title = `${data.store.nameAr || data.store.name} | ${siteName}`
  const description = data.store.descriptionAr || data.store.description || `Welcome to ${data.store.nameAr || data.store.name}`
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/store/${params.slug}`
  
  return {
    title: title,
    description: description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://storify.com'),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: siteName,
      images: data.store.logoUrl ? [
        {
          url: data.store.logoUrl,
          width: 800,
          height: 800,
          alt: data.store.name,
        }
      ] : [],
      locale: 'ar_SA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: data.store.logoUrl ? [data.store.logoUrl] : [],
    }
  }
}

export default async function PublicStorePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const [data, siteName] = await Promise.all([
    getStoreData(params.slug),
    getSiteName()
  ])

  if (!data) notFound()

  return (
    <StorefrontClient 
      store={data.store as any} 
      products={data.products as any} 
      siteName={siteName} 
      initialLanguage={data.store.defaultLanguage as any}
    />
  )
}
