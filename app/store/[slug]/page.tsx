import { notFound } from 'next/navigation'
import { StorefrontClient } from '@/components/store/storefront-client'
import { translations } from '@/lib/types'
import { Metadata } from 'next'

// Fetch site name
async function getSiteName() {
  return 'Storify'
}

// Fetch store and products from Laravel API
async function getStoreData(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/public/store/${slug}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success) return null
    
    return json.data
  } catch (error) {
    console.error('[Storefront] Fetch error:', error)
    return null
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
