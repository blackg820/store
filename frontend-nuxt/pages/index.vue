<script setup>
import { categoryPath, storefrontHost } from '~/composables/useStorefrontData'
import { useSeo } from '~/composables/useSeo'

definePageMeta({ layout: 'storefront' })

const { t } = useI18n()
const { tenant, data, status, error } = await useStorefrontData('home')

const store = computed(() => data.value?.store || tenant.value?.store || null)
const products = computed(() => data.value?.products || [])
const categories = computed(() => data.value?.sections?.categoriesWithCounts || data.value?.categories || [])
const featuredProducts = computed(() => {
  return data.value?.sections?.featuredProducts?.length
    ? data.value.sections.featuredProducts
    : products.value.slice(0, 8)
})
const host = computed(() => storefrontHost(data.value, tenant.value))
const canonical = computed(() => host.value ? `https://${host.value}/` : undefined)
const image = computed(() => store.value?.coverUrl || store.value?.logoUrl || featuredProducts.value[0]?.imageUrl)

useSeo({
  title: store.value?.name || t('storefront.meta.storeNotFoundTitle'),
  description: store.value?.bio || store.value?.description || t('storefront.meta.defaultDescription'),
  image: image.value,
  canonical: canonical.value,
  jsonLd: store.value ? {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.value.name,
    description: store.value.bio || store.value.description,
    image: image.value,
    url: canonical.value,
  } : undefined,
})
</script>

<template>
  <div class="storefront-page">
    <AppLoading v-if="status === 'pending'" :label="t('storefront.home.loading')" />

    <AppError
      v-else-if="error || !store"
      :title="t('storefront.errors.storeNotFoundTitle')"
      :message="error || t('storefront.errors.storeNotFoundMessage')"
    />

    <div v-else class="storefront-stack">
      <StoreHeader :store="store" />
      <StoreHero
        :store="store"
        :product-count="products.length"
        :category-count="categories.length"
      />

      <section v-if="categories.length" class="store-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('storefront.home.categoryEyebrow') }}</p>
            <h2>{{ t('storefront.home.categoryTitle') }}</h2>
          </div>
          <AppButton to="/categories" variant="secondary">{{ t('storefront.common.viewAll') }}</AppButton>
        </div>
        <div class="category-strip">
          <NuxtLink
            v-for="category in categories.slice(0, 8)"
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
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('storefront.home.featuredEyebrow') }}</p>
            <h2>{{ t('storefront.home.featuredTitle', { store: store.name }) }}</h2>
          </div>
          <AppButton to="/products" variant="secondary">{{ t('storefront.common.allProducts') }}</AppButton>
        </div>
        <div v-if="featuredProducts.length" class="product-grid">
          <ProductCard
            v-for="product in featuredProducts"
            :key="product.id || product.slug"
            :product="product"
            :currency="store.currency"
          />
        </div>
        <AppEmptyState
          v-else
          :title="t('storefront.empty.productsTitle')"
          :message="t('storefront.empty.productsMessage')"
        />
      </section>

      <AppCard v-if="products.length" class="store-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('storefront.home.readyEyebrow') }}</p>
            <h2>{{ store.checkoutEnabled ? t('storefront.home.checkoutAvailable') : t('storefront.home.checkoutPaused') }}</h2>
            <p>{{ store.whatsappNumber ? t('storefront.home.whatsappHelp') : t('storefront.home.orderingUpdates') }}</p>
          </div>
          <AppButton
            v-if="store.whatsappNumber"
            :to="`https://wa.me/${store.whatsappNumber}`"
            variant="primary"
          >
            {{ t('storefront.common.whatsapp') }}
          </AppButton>
        </div>
      </AppCard>
    </div>
  </div>
</template>
