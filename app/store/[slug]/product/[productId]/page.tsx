import { Metadata } from 'next'
import { queryOne } from '@/lib/db'
import ProductClient from './product-client'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; productId: string }>
}

async function getSiteName() {
  // Site name could also be moved to a public config endpoint in Laravel
  return 'Storify'
}

async function getProductData(productId: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/public/product/${productId}`, {
      next: { revalidate: 3600 }
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.success ? json.data : null
  } catch (e) {
    return null
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const [product, siteName] = await Promise.all([
    getProductData(params.productId),
    getSiteName()
  ])

  if (!product) return { title: 'Product Not Found' }

  const title = `${product.titleAr || product.title} | ${product.store.nameAr || product.store.name}`
  const description = product.descriptionAr || product.description || `Buy ${product.title} from ${product.store.name}`
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
