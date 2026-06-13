<script setup>
import { categoryPath, storefrontHost } from '~/composables/useStorefrontData'
import { useSeo } from '~/composables/useSeo'

definePageMeta({ layout: 'storefront' })

const { t } = useI18n()
const { tenant, data, status, error } = await useStorefrontData('categories')

const store = computed(() => data.value?.store || tenant.value?.store || null)
const categories = computed(() => data.value?.categories || [])
const host = computed(() => storefrontHost(data.value, tenant.value))

useSeo({
  title: store.value ? `${t('storefront.categories.title')} | ${store.value.name}` : t('storefront.categories.title'),
  description: store.value?.description || t('storefront.meta.browseStoreCategories'),
  image: store.value?.coverUrl || store.value?.logoUrl,
  canonical: host.value ? `https://${host.value}/categories` : undefined,
})
</script>

<template>
  <div class="storefront-page">
    <AppLoading v-if="status === 'pending'" :label="t('storefront.categories.loading')" />
    <AppError v-else-if="error || !store" :title="t('storefront.categories.unavailable')" :message="error" />

    <div v-else class="storefront-stack">
      <StoreHeader :store="store" />
      <AppCard class="store-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('storefront.categories.title') }}</p>
            <h2>{{ t('storefront.categories.browseStore', { store: store.name }) }}</h2>
            <p>{{ t('storefront.categories.count', { count: categories.length }) }}</p>
          </div>
          <AppButton to="/" variant="secondary">{{ t('storefront.common.storeHome') }}</AppButton>
        </div>
      </AppCard>

      <div v-if="categories.length" class="category-strip">
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
      <AppEmptyState v-else :title="t('storefront.categories.emptyTitle')" :message="t('storefront.categories.emptyMessage')" />
    </div>
  </div>
</template>
