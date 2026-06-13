<script setup>
const { t } = useI18n()
const { availableLocales, currentLocale, selectStorefrontLocale } = useStorefrontLocale()

const localeLabel = (code) => t(`storefront.language.${code}`)
</script>

<template>
  <div class="language-switcher" :aria-label="t('storefront.header.languageSelector')">
    <button
      v-for="item in availableLocales"
      :key="item.code"
      type="button"
      class="language-switcher__item"
      :class="{ 'is-active': currentLocale === item.code }"
      :aria-label="localeLabel(item.code)"
      :aria-pressed="currentLocale === item.code"
      @click="selectStorefrontLocale(item.code)"
    >
      {{ item.code.toUpperCase() }}
    </button>
  </div>
</template>
