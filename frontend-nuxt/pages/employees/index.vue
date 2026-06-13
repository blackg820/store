<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('employees') }}</p>
    <h1>Employees</h1>
    <p class="muted">Store-owner employee management migration target. Employee limits remain backend-enforced.</p>
  </section>
</template>
