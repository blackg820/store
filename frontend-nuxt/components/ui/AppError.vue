<script setup>
const { t } = useI18n()

defineProps({
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="state-box state-box--error" role="alert">
    <div class="state-box__mark" aria-hidden="true" />
    <h2>{{ title || t('storefront.errors.genericTitle') }}</h2>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>
