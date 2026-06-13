<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('categories') }}</p>
    <h1>Categories and product types</h1>
    <p class="muted">Catalog schema/category migration target using existing Laravel category and product type APIs.</p>
  </section>
</template>
