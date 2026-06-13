import { Metadata } from 'next'
import ProductClient, { type PublicProduct, type PublicStore } from './product-client'
import { getAbsoluteStoreUrl } from '@/lib/store-utils'
import { translations } from '@/lib/types'
import { resolveStorefrontIdentifier } from '../../storefront-data'

interface Props {
  params: Promise<{ slug: string; productId: string }>
}

interface PublicStoreResponse {
  success: boolean
  data?: {
    store?: PublicStore
    products?: PublicProduct[]
  }
}

interface PublicProductResponse {
  success: boolean
  data?: PublicProduct
}

interface ProductPageData {
  store: PublicStore | null
  product: PublicProduct | null
  products: PublicProduct[]
}

async function fetchPublicJson<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${path}`, {
      next: { revalidate },
    })

    if (!res.ok) return null

    return await res.json() as T
  } catch {
    return null
  }
}

async function getProductPageData(slug: string, productId: string): Promise<ProductPageData & { canonicalSlug: string; canonicalOrigin: string | null }> {
  const tenant = await resolveStorefrontIdentifier(slug)
  const canonicalSlug = tenant.identifier
  const [storeResponse, productResponse] = await Promise.all([
    fetchPublicJson<PublicStoreResponse>(`/api/v1/public/store/${encodeURIComponent(canonicalSlug)}`),
    fetchPublicJson<PublicProductResponse>(`/api/v1/public/product/${encodeURIComponent(productId)}?storeSlug=${encodeURIComponent(canonicalSlug)}`),
  ])

  const store = storeResponse?.success ? storeResponse.data?.store ?? null : null
  const products = storeResponse?.success ? storeResponse.data?.products ?? [] : []
  const product = productResponse?.success ? productResponse.data ?? null : null
  const productStore = product?.store ?? null
  const resolvedStore = store ?? productStore

  if (product && productStore?.slug && productStore.slug !== canonicalSlug) {
    return { store: resolvedStore, product: null, products, canonicalSlug, canonicalOrigin: tenant.canonicalOrigin || null }
  }

  if (product && resolvedStore && String(product.storeId) !== String(resolvedStore.id)) {
    return { store: resolvedStore, product: null, products, canonicalSlug, canonicalOrigin: tenant.canonicalOrigin || null }
  }

  return { store: resolvedStore, product, products, canonicalSlug, canonicalOrigin: tenant.canonicalOrigin || null }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { product, store, canonicalSlug, canonicalOrigin } = await getProductPageData(params.slug, params.productId)

  if (!product || !store) {
    return {
      title: translations.en.productDetailProductNotFound,
      robots: { index: false, follow: false },
    }
  }

  const title = `${product.title} | ${store.name}`
  const description = product.description || title
  const url = canonicalOrigin
    ? `${canonicalOrigin}/product/${params.productId}`
    : getAbsoluteStoreUrl(canonicalSlug, `/product/${params.productId}`)
  const imageUrl = product.imageUrl ?? product.media?.find((media) => media.type !== 'video')?.url

  return {
    title,
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://storify.com'),
    openGraph: {
      title,
      description,
      url,
      siteName: store.name,
      images: imageUrl ? [{ url: imageUrl }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function Page(props: Props) {
  const params = await props.params
  const { store, product, products, canonicalSlug } = await getProductPageData(params.slug, params.productId)

  return (
    <ProductClient
      params={{ ...params, slug: canonicalSlug }}
      initialStore={store}
      initialProduct={product}
      initialProducts={products}
      initialLoadComplete
    />
  )
}
