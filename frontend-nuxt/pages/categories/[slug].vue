<script setup>
import { storefrontHost } from '~/composables/useStorefrontData'
import { useSeo } from '~/composables/useSeo'

definePageMeta({ layout: 'storefront' })

const route = useRoute()
const { t } = useI18n()
const slug = computed(() => String(route.params.slug || ''))
const { tenant, data, status, error } = await useStorefrontData(`category:${slug.value}`)

const store = computed(() => data.value?.store || tenant.value?.store || null)
const categories = computed(() => data.value?.categories || [])
const category = computed(() => {
  return categories.value.find((item) => {
    return String(item.slug || '') === slug.value || String(item.id || '') === slug.value
  }) || null
})
const products = computed(() => {
  if (!category.value) return []
  return (data.value?.products || []).filter((product) => {
    return String(product.categoryId || '') === String(category.value.id || '')
      || String(product.categorySlug || '') === String(category.value.slug || '')
      || String(product.category?.slug || '') === String(category.value.slug || '')
  })
})
const host = computed(() => storefrontHost(data.value, tenant.value))

useSeo({
  title: category.value && store.value ? `${category.value.name} | ${store.value.name}` : t('storefront.meta.categoryTitle'),
  description: store.value?.description || t('storefront.meta.browseCategoryProducts'),
  image: store.value?.coverUrl || store.value?.logoUrl || products.value[0]?.imageUrl,
  canonical: host.value ? `https://${host.value}/categories/${slug.value}` : undefined,
})
</script>

<template>
  <div class="storefront-page">
    <AppLoading v-if="status === 'pending'" :label="t('storefront.category.loading')" />
    <AppError v-else-if="error || !store" :title="t('storefront.category.unavailable')" :message="error" />

    <div v-else class="storefront-stack">
      <StoreHeader :store="store" />

      <AppError
        v-if="!category"
        :title="t('storefront.category.notFoundTitle')"
        :message="t('storefront.category.notFoundMessage')"
      >
        <AppButton to="/categories" variant="secondary">{{ t('storefront.common.backToCategories') }}</AppButton>
      </AppError>

      <template v-else>
        <AppCard class="store-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">{{ t('storefront.category.eyebrow') }}</p>
              <h2>{{ category.name }}</h2>
              <p>{{ t('storefront.category.count', { count: products.length }) }}</p>
            </div>
            <AppButton to="/products" variant="secondary">{{ t('storefront.common.allProducts') }}</AppButton>
          </div>
        </AppCard>

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
          :title="t('storefront.category.emptyTitle')"
          :message="t('storefront.category.emptyMessage')"
        />
      </template>
    </div>
  </div>
</template>
