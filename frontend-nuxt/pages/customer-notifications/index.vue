<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('customerNotifications') }}</p>
    <h1>Customer notifications</h1>
    <p class="muted">Campaigns, delivery stats, scheduling, and plan limits migrate here using the existing Laravel endpoints.</p>
  </section>
</template>
