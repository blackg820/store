<script setup>
definePageMeta({ layout: 'dashboard' })

const dashboard = useDashboardStore()

onMounted(() => {
  if (!dashboard.payload) {
    dashboard.load().catch(() => {})
  }
})
</script>

<template>
  <section class="stack">
    <div class="page-heading">
      <p class="eyebrow">Nuxt dashboard</p>
      <h1>{{ $t('overview') }}</h1>
      <p class="muted">This page is connected to Laravel dashboard bootstrap data and will absorb Next dashboard modules page by page.</p>
    </div>

    <div v-if="dashboard.error" class="notice danger">{{ dashboard.error }}</div>

    <div class="metric-grid">
      <div class="metric-card">
        <span>{{ $t('stores') }}</span>
        <strong>{{ dashboard.stores.length }}</strong>
      </div>
      <div class="metric-card">
        <span>{{ $t('notifications') }}</span>
        <strong>{{ dashboard.notifications.length }}</strong>
      </div>
      <div class="metric-card">
        <span>Status</span>
        <strong>{{ dashboard.isLoading ? 'Loading' : 'Ready' }}</strong>
      </div>
    </div>
  </section>
</template>
