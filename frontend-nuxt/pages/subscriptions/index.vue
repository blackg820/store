<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('subscriptions') }}</p>
    <h1>Subscription usage</h1>
    <p class="muted">Usage and plan visibility migration target. Orders are not a SaaS-limited feature.</p>
  </section>
</template>
