export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const request = async (endpoint, options = {}) => {
    const auth = useAuthStore()
    const tenant = useTenantStore()
    const localeCookie = useCookie('dokani_locale')
    const headers = new Headers(options.headers || {})

    headers.set('Accept', 'application/json')
    headers.set('Content-Type', 'application/json')
    headers.set('Accept-Language', localeCookie.value || 'ar')

    if (auth.accessToken) {
      headers.set('Authorization', `Bearer ${auth.accessToken}`)
    }

    const storeId = options.storeId !== undefined ? options.storeId : tenant.selectedStoreId
    if (auth.accessToken && storeId) {
      headers.set('X-Store-ID', storeId)
    }

    const query = options.params ? new URLSearchParams(options.params).toString() : ''
    const path = `${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}${query ? `?${query}` : ''}`
    const baseURL = process.server ? config.internalApiBaseUrl : config.public.apiBaseUrl || ''

    try {
      return await $fetch(path, {
        baseURL,
        method: options.method || 'GET',
        body: options.body,
        headers,
      })
    } catch (error) {
      const status = error?.response?.status || error?.statusCode || 500
      const payload = error?.data || error?.response?._data || {}

      if (status === 401 && auth.refreshToken && !options.skipRefresh) {
        const refreshed = await auth.refreshSession()
        if (refreshed) {
          return request(endpoint, { ...options, skipRefresh: true })
        }
      }

      if ((status === 401 || status === 403) && ['TENANT_ACCESS_DENIED', 'UNAUTHENTICATED_TENANT'].includes(payload?.code)) {
        tenant.clearSelectedStore()
      }

      throw createError({
        statusCode: status,
        statusMessage: payload?.message || statusMessage(status),
        data: payload,
      })
    }
  }

  return {
    provide: {
      api: request,
    },
  }
})

function statusMessage(status) {
  if (status === 401) return 'Authentication is required'
  if (status === 403) return 'Access denied'
  if (status === 422) return 'Validation failed'
  if (status === 429) return 'Too many requests'
  return 'API request failed'
}
