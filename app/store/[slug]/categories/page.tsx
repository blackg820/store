import { notFound } from 'next/navigation'
import { StorefrontClient } from '@/components/store/storefront-client'
import { getStorefrontPageContext, normalizeInitialLanguage } from '../storefront-data'

export default async function StoreCategoriesPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const { data, settings } = await getStorefrontPageContext(params.slug)

  if (!data) notFound()

  return (
    <StorefrontClient
      store={data.store}
      products={data.products}
      categories={data.categories}
      productTypes={data.productTypes}
      sections={data.sections}
      siteName={settings.site_name}
      saasContactWhatsapp={settings.saas_contact_whatsapp}
      initialLanguage={normalizeInitialLanguage(data.store.defaultLanguage)}
      initialView="categories"
    />
  )
}
