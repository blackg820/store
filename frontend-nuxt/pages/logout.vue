<script setup>
const auth = useAuthStore()
await auth.logout()
</script>

<template>
  <section class="shell centered">
    <div class="panel narrow">Signing out...</div>
  </section>
</template>
