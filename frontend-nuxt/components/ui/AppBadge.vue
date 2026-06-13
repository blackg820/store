<script setup>
defineProps({
  tone: {
    type: String,
    default: 'neutral',
  },
})
</script>

<template>
  <span class="app-badge" :class="`app-badge--${tone}`">
    <slot />
  </span>
</template>
