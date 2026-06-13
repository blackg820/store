<script setup>
defineProps({
  error: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <main class="shell centered">
    <section class="panel narrow">
      <p class="eyebrow">{{ t('storefront.errors.appTitle') }}</p>
      <h1>{{ error.statusCode || 500 }}</h1>
      <p>{{ error.statusMessage || error.message || t('storefront.errors.genericMessage') }}</p>
      <button class="button" type="button" @click="handleError">{{ t('storefront.errors.returnHome') }}</button>
    </section>
  </main>
</template>
