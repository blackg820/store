<script setup>
const { t } = useI18n()

defineProps({
  count: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <button class="cart-button" type="button" :aria-label="t('storefront.header.cart')">
    <span class="cart-button__icon" aria-hidden="true" />
    <span class="cart-button__label">{{ t('storefront.header.cart') }}</span>
    <span class="cart-button__count">{{ count }}</span>
  </button>
</template>
