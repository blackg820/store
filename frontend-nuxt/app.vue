<script setup>
const { ensureStorefrontLocale } = useStorefrontLocale()
await ensureStorefrontLocale()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
