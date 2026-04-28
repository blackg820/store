import { Metadata } from 'next'
import { queryOne } from '@/lib/db'
import ProductClient from './product-client'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; productId: string }>
}

async function getSiteName() {
  const siteNameSetting = await queryOne<any>(
    "SELECT setting_value FROM global_settings WHERE setting_key = 'site_name'"
  )
  return siteNameSetting?.setting_value || 'Storify'
}

async function getProductData(productId: string) {
  const product = await queryOne<any>(
    `SELECT p.*, s.name as store_name, s.name_ar as store_name_ar, s.logo_url as store_logo
     FROM products p
     JOIN stores s ON p.store_id = s.id
     WHERE p.id = ? AND p.deleted_at IS NULL`,
    [productId]
  )

  if (!product) return null

  const media = await queryOne<any>(
    "SELECT url FROM media WHERE product_id = ? AND type = 'image' AND deleted_at IS NULL LIMIT 1",
    [productId]
  )

  return {
    ...product,
    imageUrl: media?.url || product.store_logo
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const [product, siteName] = await Promise.all([
    getProductData(params.productId),
    getSiteName()
  ])

  if (!product) return { title: 'Product Not Found' }

  const title = `${product.title_ar || product.title} | ${product.store_name_ar || product.store_name}`
  const description = product.description_ar || product.description || `Buy ${product.title} from ${product.store_name}`
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/store/${params.slug}/product/${params.productId}`

  return {
    title: title,
    description: description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://storify.com'),
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: siteName,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: product.imageUrl ? [product.imageUrl] : [],
    }
  }
}

export default async function Page(props: Props) {
  const params = await props.params
  return <ProductClient params={Promise.resolve(params)} />
}
