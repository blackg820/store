<script setup>
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const form = reactive({ email: '', password: '' })
const error = ref(null)
const isSubmitting = ref(false)

async function submit() {
  error.value = null
  isSubmitting.value = true
  try {
    await auth.login(form)
    await navigateTo(auth.redirectPath())
  } catch (err) {
    error.value = err?.statusMessage || err?.message || 'Login failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form class="auth-card" @submit.prevent="submit">
    <p class="eyebrow">{{ $t('login') }}</p>
    <h1>Dokani</h1>
    <label>
      Email
      <input v-model="form.email" type="email" autocomplete="email" required>
    </label>
    <label>
      Password
      <input v-model="form.password" type="password" autocomplete="current-password" required>
    </label>
    <p v-if="error" class="notice danger">{{ error }}</p>
    <button class="button" type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Signing in...' : $t('login') }}
    </button>
  </form>
</template>
