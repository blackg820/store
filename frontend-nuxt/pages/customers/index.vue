<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('customers') }}</p>
    <h1>Customers and risk</h1>
    <p class="muted">Buyer list and global phone risk UI migration target. Risk does not auto-block checkout.</p>
  </section>
</template>
