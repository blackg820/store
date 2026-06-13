<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('analytics') }}</p>
    <h1>Analytics</h1>
    <p class="muted">Date-range analytics cards and charts migrate here from `/api/v1/analytics/dashboard`.</p>
  </section>
</template>
