<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="stack">
    <div class="page-heading">
      <p class="eyebrow">Account</p>
      <h1>Profile</h1>
      <p class="muted">Profile and password migration target. Existing Laravel profile endpoints remain the source of truth.</p>
    </div>
  </section>
</template>
