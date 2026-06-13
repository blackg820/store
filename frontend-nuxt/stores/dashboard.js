export const useDashboardStore = defineStore('dashboard', () => {
  const isLoading = ref(false)
  const error = ref(null)
  const payload = ref(null)

  const stores = computed(() => payload.value?.stores || [])
  const notifications = computed(() => payload.value?.notifications || [])
  const settings = computed(() => payload.value?.settings || {})

  async function load() {
    const { $api } = useNuxtApp()
    isLoading.value = true
    error.value = null
    try {
      const response = await $api('/api/v1/dashboard/init', { storeId: null })
      payload.value = response.data
      return response.data
    } catch (err) {
      error.value = err?.statusMessage || err?.message || 'Dashboard failed to load'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    payload,
    stores,
    notifications,
    settings,
    load,
  }
})
