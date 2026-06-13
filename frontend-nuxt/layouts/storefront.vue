<script setup>
const { currentLocale, direction } = useStorefrontLocale()

useHead({
  htmlAttrs: {
    lang: currentLocale,
    dir: direction,
  },
})
</script>

<template>
  <main class="storefront-layout">
    <slot />
  </main>
</template>
