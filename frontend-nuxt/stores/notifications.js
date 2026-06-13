export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([])
  const unreadCount = ref(0)
  const isLoading = ref(false)
  const error = ref(null)

  async function load() {
    const { $api } = useNuxtApp()
    isLoading.value = true
    error.value = null
    try {
      const [list, count] = await Promise.all([
        $api('/api/v1/notifications'),
        $api('/api/v1/notifications/unread-count'),
      ])
      items.value = list.data?.data || list.data || []
      unreadCount.value = count.data?.count || count.data?.unreadCount || 0
    } catch (err) {
      error.value = err?.statusMessage || err?.message || 'Notifications failed to load'
    } finally {
      isLoading.value = false
    }
  }

  return {
    items,
    unreadCount,
    isLoading,
    error,
    load,
  }
})
