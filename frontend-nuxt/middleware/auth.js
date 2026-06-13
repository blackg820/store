export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated && auth.refreshToken) {
    await auth.refreshSession()
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }
})
