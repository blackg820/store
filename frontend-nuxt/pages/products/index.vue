<script setup>
import { categoryPath, storefrontHost } from '~/composables/useStorefrontData'
import { useSeo } from '~/composables/useSeo'

definePageMeta({ layout: 'storefront' })

const { t } = useI18n()
const { tenant, data, status, error } = await useStorefrontData('products')

const store = computed(() => data.value?.store || tenant.value?.store || null)
const products = computed(() => data.value?.products || [])
const categories = computed(() => data.value?.categories || [])
const host = computed(() => storefrontHost(data.value, tenant.value))

useSeo({
  title: store.value ? `${t('storefront.products.title')} | ${store.value.name}` : t('storefront.products.title'),
  description: store.value?.description || t('storefront.meta.browseProducts'),
  image: store.value?.coverUrl || store.value?.logoUrl || products.value[0]?.imageUrl,
  canonical: host.value ? `https://${host.value}/products` : undefined,
})
</script>

<template>
  <div class="storefront-page">
    <AppLoading v-if="status === 'pending'" :label="t('storefront.products.loading')" />
    <AppError v-else-if="error || !store" :title="t('storefront.products.unavailable')" :message="error" />

    <div v-else class="storefront-stack">
      <StoreHeader :store="store" />

      <AppCard class="store-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('storefront.products.title') }}</p>
            <h2>{{ store.name }}</h2>
            <p>{{ t('storefront.products.count', { count: products.length }) }}</p>
          </div>
          <AppButton to="/" variant="secondary">{{ t('storefront.common.storeHome') }}</AppButton>
        </div>
      </AppCard>

      <section v-if="categories.length" class="store-section">
        <div class="category-strip">
          <NuxtLink
            v-for="category in categories"
            :key="category.id || category.slug"
            class="category-pill"
            :to="categoryPath(category)"
          >
            <strong>{{ category.name }}</strong>
            <span>{{ category.productsCount || 0 }} {{ t('storefront.common.items') }}</span>
          </NuxtLink>
        </div>
      </section>

      <section class="store-section">
        <div v-if="products.length" class="product-grid">
          <ProductCard
            v-for="product in products"
            :key="product.id || product.slug"
            :product="product"
            :currency="store.currency"
          />
        </div>
        <AppEmptyState
          v-else
          :title="t('storefront.products.emptyTitle')"
          :message="t('storefront.products.emptyMessage')"
        />
      </section>
    </div>
  </div>
</template>
