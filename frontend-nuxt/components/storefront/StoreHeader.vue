<script setup>
const props = defineProps({
  store: {
    type: Object,
    default: null,
  },
})

const { t } = useI18n()
const logoFailed = ref(false)
const logoUrl = computed(() => props.store?.logoUrl || props.store?.profilePhotoUrl || '')
</script>

<template>
  <header class="store-header">
    <NuxtLink to="/" class="store-header__brand">
      <span class="store-logo store-logo--small">
        <img
          v-if="logoUrl && !logoFailed"
          :src="logoUrl"
          :alt="store?.name || t('storefront.header.storeLogo')"
          loading="eager"
          @error="logoFailed = true"
        >
        <span v-else>{{ (store?.name || 'D').slice(0, 1) }}</span>
      </span>
      <span class="store-header__copy">
        <strong>{{ store?.name || 'Dokani' }}</strong>
        <small>{{ store?.description || store?.bio || t('storefront.header.onlineStorefront') }}</small>
      </span>
    </NuxtLink>

    <nav class="store-header__nav" :aria-label="t('storefront.header.storeNavigation')">
      <NuxtLink to="/products">{{ t('storefront.products.title') }}</NuxtLink>
      <NuxtLink to="/categories">{{ t('storefront.categories.title') }}</NuxtLink>
    </nav>

    <div class="store-header__actions">
      <LanguageSwitcher />
      <CartButton />
    </div>
  </header>
</template>
