<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'admin' })
</script>

<template>
  <section class="stack">
    <div class="page-heading">
      <p class="eyebrow">{{ $t('admin') }}</p>
      <h1>Platform administration</h1>
      <p class="muted">Admin pages migrate here using existing Laravel admin APIs and sanitized ops data only.</p>
    </div>
    <div class="route-grid">
      <NuxtLink to="/admin/users" class="route-card">{{ $t('customers') }}</NuxtLink>
      <NuxtLink to="/admin/subscriptions" class="route-card">{{ $t('subscriptions') }}</NuxtLink>
      <NuxtLink to="/admin/ops" class="route-card">Ops</NuxtLink>
    </div>
  </section>
</template>
