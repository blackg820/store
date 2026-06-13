export async function useTenantResolver() {
  const tenantStore = useTenantStore()
  const config = useRuntimeConfig()
  const headers = useRequestHeaders(['host'])
  const host = headers.host || (process.client ? window.location.host : '')
  const rootDomain = config.public.rootDomain

  const { data, status, error } = await useAsyncData(
    `tenant:${host}`,
    async () => {
      if (!host) return false

      try {
        const response = await $fetch('/api/v1/public/domain/resolve', {
          baseURL: config.internalApiBaseUrl,
          query: { host },
          headers: { Accept: 'application/json' },
        })

        return response.data || false
      } catch {
        const slug = storefrontSlugFromHost(host, rootDomain)
        if (!slug) return false

        return {
          store: null,
          routing: {
            host,
            slug,
            subdomain: slug,
            customDomain: null,
            resolvedByHost: false,
          },
        }
      }
    },
    { server: true }
  )

  if (data.value) {
    tenantStore.setTenant(data.value)
  } else {
    tenantStore.clearTenant()
  }

  return {
    tenant: data,
    status,
    error: computed(() => error.value?.message || null),
  }
}

function storefrontSlugFromHost(host, rootDomain) {
  const normalizedHost = String(host || '').toLowerCase().split(':')[0].replace(/^www\./, '')
  const normalizedRoot = String(rootDomain || '').toLowerCase().replace(/^www\./, '')
  if (!normalizedHost || !normalizedRoot || normalizedHost === normalizedRoot) return null
  if (!normalizedHost.endsWith(`.${normalizedRoot}`)) return null

  const slug = normalizedHost.slice(0, -(normalizedRoot.length + 1)).split('.').pop()
  if (!slug || ['admin', 'api', 'app', 'dashboard', 'cdn', 'media', 'mail', 'www'].includes(slug)) {
    return null
  }

  return slug
}
