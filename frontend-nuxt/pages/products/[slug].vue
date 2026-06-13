<script setup>
import { formatMoney, productImage, storefrontHost } from '~/composables/useStorefrontData'
import { useSeo } from '~/composables/useSeo'

definePageMeta({ layout: 'storefront' })

const route = useRoute()
const { t } = useI18n()
const { currentLocale } = useStorefrontLocale()
const slug = computed(() => String(route.params.slug || ''))
const { tenant, data, status, error } = await useStorefrontData(`product:${slug.value}`)

const store = computed(() => data.value?.store || tenant.value?.store || null)
const products = computed(() => data.value?.products || [])
const product = computed(() => {
  return products.value.find((item) => {
    return String(item.slug || '') === slug.value || String(item.id || '') === slug.value
  }) || null
})
const relatedProducts = computed(() => {
  if (!product.value) return []
  return products.value
    .filter((item) => item.id !== product.value.id && item.categoryId === product.value.categoryId)
    .slice(0, 4)
})
const imageFailed = ref(false)
const image = computed(() => product.value ? productImage(product.value) : '')
const host = computed(() => storefrontHost(data.value, tenant.value))
const canonical = computed(() => host.value ? `https://${host.value}/products/${slug.value}` : undefined)
const finalPrice = computed(() => product.value?.finalPrice ?? product.value?.final_price ?? product.value?.price)
const hasDiscount = computed(() => Number(product.value?.discount || 0) > 0)
const moneyLocale = computed(() => storefrontNumberLocale(currentLocale.value))

useSeo({
  title: product.value && store.value ? `${product.value.title} | ${store.value.name}` : t('storefront.meta.productTitle'),
  description: product.value?.description || store.value?.description || t('storefront.meta.productDescription'),
  image: image.value || store.value?.coverUrl || store.value?.logoUrl,
  canonical: canonical.value,
  jsonLd: product.value ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.value.title,
    description: product.value.description,
    image: image.value || undefined,
    sku: product.value.sku || product.value.productCode || undefined,
    offers: {
      '@type': 'Offer',
      price: Number(finalPrice.value || 0),
      priceCurrency: store.value?.currency || 'IQD',
      availability: product.value.isActive ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: canonical.value,
    },
  } : undefined,
})
</script>

<template>
  <div class="storefront-page">
    <AppLoading v-if="status === 'pending'" :label="t('storefront.product.loading')" />
    <AppError v-else-if="error || !store" :title="t('storefront.product.unavailable')" :message="error" />

    <div v-else class="storefront-stack">
      <StoreHeader :store="store" />

      <AppError
        v-if="!product"
        :title="t('storefront.product.notFoundTitle')"
        :message="t('storefront.product.notFoundMessage')"
      >
        <AppButton to="/products" variant="secondary">{{ t('storefront.common.backToProducts') }}</AppButton>
      </AppError>

      <template v-else>
        <section class="product-detail">
          <div class="product-detail__media">
            <img
              v-if="image && !imageFailed"
              :src="image"
              :alt="product.title"
              loading="eager"
              @error="imageFailed = true"
            >
            <div v-else class="product-detail__fallback">
              {{ product.title?.slice(0, 1) || t('storefront.product.fallbackLetter') }}
            </div>
          </div>

          <AppCard class="product-detail__content">
            <AppBadge v-if="product.categoryName || product.category?.name" tone="neutral">
              {{ product.categoryName || product.category?.name }}
            </AppBadge>
            <h1>{{ product.title }}</h1>
            <p v-if="product.description" class="product-detail__description">{{ product.description }}</p>
            <div class="product-detail__price">
              <span>{{ formatMoney(finalPrice, store.currency, moneyLocale) }}</span>
              <del v-if="hasDiscount">{{ formatMoney(product.price, store.currency, moneyLocale) }}</del>
            </div>
            <AppBadge :tone="product.isActive ? 'success' : 'danger'">
              {{ product.isActive ? t('storefront.common.available') : t('storefront.common.unavailable') }}
            </AppBadge>
            <AppButton to="/products" variant="primary">{{ t('storefront.common.continueShopping') }}</AppButton>
          </AppCard>
        </section>

        <section v-if="relatedProducts.length" class="store-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">{{ t('storefront.product.relatedEyebrow') }}</p>
              <h2>{{ t('storefront.product.relatedTitle') }}</h2>
            </div>
          </div>
          <div class="product-grid">
            <ProductCard
              v-for="item in relatedProducts"
              :key="item.id || item.slug"
              :product="item"
              :currency="store.currency"
            />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
