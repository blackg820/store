<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="state-box">
    <div class="state-box__mark" aria-hidden="true" />
    <h2>{{ title }}</h2>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>
