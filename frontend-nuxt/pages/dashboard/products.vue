<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('products') }}</p>
    <h1>Products</h1>
    <p class="muted">Product table, variants, media, and Telegram posting migrate here from the existing dashboard.</p>
  </section>
</template>
