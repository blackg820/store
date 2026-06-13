<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('orders') }}</p>
    <h1>Orders</h1>
    <p class="muted">Order list, status changes, risk badges, and Al-Waseet actions migrate here. Orders remain unlimited.</p>
  </section>
</template>
