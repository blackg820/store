export const useTenantStore = defineStore('tenant', () => {
  const tenant = ref(null)
  const selectedStoreIdCookie = useCookie('dokani_selected_store_id', { sameSite: 'lax' })

  const selectedStoreId = computed(() => selectedStoreIdCookie.value || null)
  const currentStore = computed(() => tenant.value?.store || null)
  const currentHost = computed(() => tenant.value?.routing?.host || null)

  function setTenant(value) {
    tenant.value = value
  }

  function clearTenant() {
    tenant.value = null
  }

  function setSelectedStore(storeId) {
    selectedStoreIdCookie.value = storeId
  }

  function clearSelectedStore() {
    selectedStoreIdCookie.value = null
  }

  return {
    tenant,
    currentStore,
    currentHost,
    selectedStoreId,
    setTenant,
    clearTenant,
    setSelectedStore,
    clearSelectedStore,
  }
})
