<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('stores') }}</p>
    <h1>Stores</h1>
    <p class="muted">Store management, branding, status, and domain management migrate here.</p>
  </section>
</template>
