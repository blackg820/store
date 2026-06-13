import { useTenantResolver } from '~/composables/useTenantResolver'

export async function useStorefrontData(keySuffix = 'home') {
  const nuxtApp = useNuxtApp()
  const { $api } = nuxtApp
  const { ensureStorefrontLocale } = useStorefrontLocale()
  const { tenant, status, error } = await useTenantResolver()
  const storeSlug = computed(() => tenant.value?.store?.slug || tenant.value?.routing?.slug || null)

  const result = await nuxtApp.runWithContext(() =>
    useAsyncData(
      `storefront:${storeSlug.value || 'missing'}:${keySuffix}`,
      async () => {
        if (!storeSlug.value) return false
        const response = await $api(`/api/v1/public/store/${storeSlug.value}`, {
          storeId: null,
        })
        return response.data || false
      },
      {
        watch: [storeSlug],
        server: true,
      }
    )
  )

  const defaultLanguage = computed(() => {
    return result.data.value?.store?.defaultLanguage
      || result.data.value?.store?.default_language
      || tenant.value?.store?.defaultLanguage
      || tenant.value?.store?.default_language
      || ''
  })

  await ensureStorefrontLocale(defaultLanguage.value)

  if (process.client) {
    watch(defaultLanguage, (value) => {
      ensureStorefrontLocale(value)
    })
  }

  return {
    tenant,
    tenantStatus: status,
    tenantError: error,
    data: result.data,
    status: result.status,
    error: computed(() => result.error.value?.message || error.value || null),
    refresh: result.refresh,
  }
}

export function storefrontHost(data, tenant) {
  return tenant?.routing?.host || data?.store?.customDomain || data?.store?.subdomain || ''
}

export function productPath(product) {
  return `/products/${encodeURIComponent(product?.slug || product?.id || '')}`
}

export function categoryPath(category) {
  return `/categories/${encodeURIComponent(category?.slug || category?.id || '')}`
}

export function productImage(product) {
  return product?.imageUrl || product?.media?.find?.((item) => item?.url && item?.type !== 'video')?.url || ''
}

export function formatMoney(value, currency = 'IQD', locale = 'en-IQ') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'IQD' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${currency}`
  }
}
