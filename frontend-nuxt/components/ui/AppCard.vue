<script setup>
defineProps({
  as: {
    type: String,
    default: 'section',
  },
  padded: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <component
    :is="as"
    class="app-card"
    :class="{ 'app-card--flush': !padded }"
  >
    <slot />
  </component>
</template>
