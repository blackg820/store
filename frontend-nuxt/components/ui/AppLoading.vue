<script setup>
const { t } = useI18n()

defineProps({
  label: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="loading-block" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true" />
    <span>{{ label || t('storefront.loading.default') }}</span>
  </div>
</template>
