<script setup>
defineProps({
  to: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'primary',
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="app-button"
    :class="`app-button--${variant}`"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    class="app-button"
    :class="`app-button--${variant}`"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
