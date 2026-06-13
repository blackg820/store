<script setup>
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">{{ $t('settings') }}</p>
    <h1>Settings</h1>
    <p class="muted">Profile, password, store settings, Telegram, custom domain, and Al-Waseet settings migrate here.</p>
  </section>
</template>
