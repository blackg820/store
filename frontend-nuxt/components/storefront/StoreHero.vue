<script setup>
const props = defineProps({
  store: {
    type: Object,
    required: true,
  },
  productCount: {
    type: Number,
    default: 0,
  },
  categoryCount: {
    type: Number,
    default: 0,
  },
})

const { t } = useI18n()
const coverFailed = ref(false)
const logoFailed = ref(false)
const coverUrl = computed(() => props.store.coverUrl || props.store.coverPhotoUrl || '')
const logoUrl = computed(() => props.store.logoUrl || props.store.profilePhotoUrl || '')
const isOpen = computed(() => Boolean(props.store.isOpen && props.store.checkoutEnabled))
</script>

<template>
  <section class="store-hero">
    <div class="store-hero__cover">
      <img
        v-if="coverUrl && !coverFailed"
        :src="coverUrl"
        :alt="t('storefront.hero.coverAlt', { store: store.name })"
        loading="eager"
        @error="coverFailed = true"
      >
      <div v-else class="store-hero__cover-fallback">
        <span>{{ store.name }}</span>
      </div>
    </div>

    <div class="store-hero__profile">
      <span class="store-logo store-logo--large">
        <img
          v-if="logoUrl && !logoFailed"
          :src="logoUrl"
          :alt="t('storefront.hero.logoAlt', { store: store.name })"
          loading="eager"
          @error="logoFailed = true"
        >
        <span v-else>{{ store.name.slice(0, 1) }}</span>
      </span>

      <div class="store-hero__text">
        <AppBadge :tone="isOpen ? 'success' : 'danger'">
          {{ isOpen ? t('storefront.hero.open') : t('storefront.hero.closed') }}
        </AppBadge>
        <h1>{{ store.name }}</h1>
        <p>{{ store.bio || store.description || t('storefront.hero.defaultDescription') }}</p>
      </div>

      <div class="store-hero__stats" :aria-label="t('storefront.hero.statsLabel')">
        <span><strong>{{ productCount }}</strong> {{ t('storefront.hero.products') }}</span>
        <span><strong>{{ categoryCount }}</strong> {{ t('storefront.hero.categories') }}</span>
        <span><strong>{{ store.deliveryDays || 3 }}</strong> {{ t('storefront.hero.daysDelivery') }}</span>
      </div>
    </div>
  </section>
</template>
