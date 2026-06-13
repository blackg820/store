<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { $api } = useNuxtApp()
const { data, pending, error } = await useAsyncData('admin-ops-summary', async () => {
  const response = await $api('/api/v1/admin/ops/summary', { storeId: null })
  return response.data
})
</script>

<template>
  <section class="stack">
    <div class="page-heading">
      <p class="eyebrow">Operations</p>
      <h1>Ops dashboard</h1>
      <p class="muted">Safe operational summary from Laravel. No provider secrets are rendered.</p>
    </div>
    <div v-if="pending" class="panel">Loading ops summary...</div>
    <div v-else-if="error" class="notice danger">{{ error.statusMessage || 'Ops summary failed' }}</div>
    <div v-else class="metric-grid">
      <div class="metric-card">
        <span>Failed jobs</span>
        <strong>{{ data?.queues?.failed || 0 }}</strong>
      </div>
      <div class="metric-card">
        <span>Pending jobs</span>
        <strong>{{ data?.queues?.pending || 0 }}</strong>
      </div>
      <div class="metric-card">
        <span>Notification failures</span>
        <strong>{{ data?.notifications?.failedToday || 0 }}</strong>
      </div>
    </div>
  </section>
</template>
