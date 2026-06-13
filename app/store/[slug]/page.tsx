import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { StorefrontClient } from '@/components/store/storefront-client'
import { canonicalStoreUrl, getStorefrontPageContext, isReservedStorefrontHost, normalizeInitialLanguage } from './storefront-data'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const { data, settings, tenant } = await getStorefrontPageContext(params.slug)

  if (!data || isReservedStorefrontHost(tenant.host)) return { title: 'Store Not Found' }
  const siteName = settings.site_name

  const title = `${siteName} - ${data.store.name}`
  const description = data.store.description || `Welcome to ${data.store.name}`
  const url = canonicalStoreUrl(tenant, data.store.slug || params.slug)
  const imageUrl = data.store.coverUrl || data.store.logoUrl || undefined

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
      images: imageUrl ? [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
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
      images: imageUrl ? [imageUrl] : [],
    }
  }
}

export default async function PublicStorePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const { data, settings, tenant } = await getStorefrontPageContext(params.slug)
  const siteName = settings.site_name

  if (!data || isReservedStorefrontHost(tenant.host)) notFound()

  return (
    <StorefrontClient
      store={data.store}
      products={data.products}
      categories={data.categories}
      productTypes={data.productTypes}
      sections={data.sections}
      siteName={siteName}
      saasContactWhatsapp={settings.saas_contact_whatsapp}
      initialLanguage={normalizeInitialLanguage(data.store.defaultLanguage)}
    />
  )
}
