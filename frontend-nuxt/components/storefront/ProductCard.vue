<script setup>
import { formatMoney, productImage, productPath } from '~/composables/useStorefrontData'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  currency: {
    type: String,
    default: 'IQD',
  },
})

const { t } = useI18n()
const { currentLocale } = useStorefrontLocale()
const imageFailed = ref(false)
const imageUrl = computed(() => productImage(props.product))
const hasDiscount = computed(() => Number(props.product.discount || 0) > 0)
const finalPrice = computed(() => props.product.finalPrice ?? props.product.final_price ?? props.product.price)
const moneyLocale = computed(() => storefrontNumberLocale(currentLocale.value))
</script>

<template>
  <NuxtLink class="product-card" :to="productPath(product)">
    <span class="product-card__media">
      <img
        v-if="imageUrl && !imageFailed"
        :src="imageUrl"
        :alt="product.title"
        loading="lazy"
        @error="imageFailed = true"
      >
      <span v-else class="product-card__fallback">
        {{ product.title?.slice(0, 1) || t('storefront.product.fallbackLetter') }}
      </span>
      <AppBadge v-if="hasDiscount" tone="sale" class="product-card__badge">
        {{ Number(product.discount).toFixed(0) }}% {{ t('storefront.common.off') }}
      </AppBadge>
    </span>

    <span class="product-card__body">
      <span v-if="product.categoryName || product.category?.name" class="product-card__category">
        {{ product.categoryName || product.category?.name }}
      </span>
      <strong>{{ product.title }}</strong>
      <span v-if="product.description" class="product-card__description">{{ product.description }}</span>
      <span class="product-card__price">
        <span>{{ formatMoney(finalPrice, currency, moneyLocale) }}</span>
        <del v-if="hasDiscount">{{ formatMoney(product.price, currency, moneyLocale) }}</del>
      </span>
    </span>
  </NuxtLink>
</template>
