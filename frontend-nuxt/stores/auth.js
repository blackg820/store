export const useAuthStore = defineStore('auth', () => {
  const accessTokenCookie = useCookie('dokani_access_token', { sameSite: 'lax' })
  const refreshTokenCookie = useCookie('dokani_refresh_token', { sameSite: 'lax' })
  const userCookie = useCookie('dokani_user', { sameSite: 'lax' })
  const user = ref(userCookie.value || null)
  const refreshing = ref(null)

  const accessToken = computed(() => accessTokenCookie.value || null)
  const refreshToken = computed(() => refreshTokenCookie.value || null)
  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const role = computed(() => user.value?.role || null)

  function setSession(payload) {
    accessTokenCookie.value = payload.accessToken
    refreshTokenCookie.value = payload.refreshToken
    user.value = payload.user || null
    userCookie.value = payload.user || null
  }

  function clearSession() {
    accessTokenCookie.value = null
    refreshTokenCookie.value = null
    userCookie.value = null
    user.value = null
  }

  async function login(payload) {
    const { $api } = useNuxtApp()
    const response = await $api('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
      storeId: null,
    })
    setSession(response.data)
    return response.data
  }

  async function refreshSession() {
    if (refreshing.value) return refreshing.value
    if (!refreshTokenCookie.value) return false

    refreshing.value = (async () => {
      try {
        const config = useRuntimeConfig()
        const baseURL = process.server
          ? config.internalApiBaseUrl
          : config.public.apiBaseUrl || ''
        const response = await $fetch('/api/v1/auth/refresh', {
          baseURL,
          method: 'POST',
          body: { refreshToken: refreshTokenCookie.value },
        })
        setSession(response.data)
        return true
      } catch {
        clearSession()
        return false
      } finally {
        refreshing.value = null
      }
    })()

    return refreshing.value
  }

  async function logout() {
    const { $api } = useNuxtApp()
    try {
      if (accessToken.value) {
        await $api('/api/v1/auth/logout', {
          method: 'POST',
          body: { refreshToken: refreshToken.value },
          storeId: null,
        })
      }
    } finally {
      clearSession()
      useTenantStore().clearSelectedStore()
      await navigateTo('/login')
    }
  }

  function redirectPath() {
    if (role.value === 'admin') return '/admin'
    return '/dashboard'
  }

  return {
    accessToken,
    refreshToken,
    user,
    role,
    isAuthenticated,
    login,
    logout,
    refreshSession,
    clearSession,
    redirectPath,
  }
})
