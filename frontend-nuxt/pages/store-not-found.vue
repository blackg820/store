<script setup>
definePageMeta({ layout: 'storefront' })

const { t } = useI18n()
</script>

<template>
  <section class="shell centered">
    <div class="panel narrow">
      <p class="eyebrow">{{ t('storefront.errors.hostNotMatchedEyebrow') }}</p>
      <h1>{{ t('storefront.errors.hostNotMatchedTitle') }}</h1>
      <p class="muted">{{ t('storefront.errors.hostNotMatchedMessage') }}</p>
    </div>
  </section>
</template>
