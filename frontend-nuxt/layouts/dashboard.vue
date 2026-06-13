<template>
  <div class="dashboard-layout">
    <aside class="dashboard-sidebar">
      <NuxtLink to="/dashboard" class="brand">Dokani</NuxtLink>
      <nav>
        <NuxtLink to="/dashboard">{{ $t('overview') }}</NuxtLink>
        <NuxtLink to="/dashboard/products">{{ $t('products') }}</NuxtLink>
        <NuxtLink to="/dashboard/orders">{{ $t('orders') }}</NuxtLink>
        <NuxtLink to="/customers">{{ $t('customers') }}</NuxtLink>
        <NuxtLink to="/customer-notifications">{{ $t('customerNotifications') }}</NuxtLink>
        <NuxtLink to="/analytics">{{ $t('analytics') }}</NuxtLink>
        <NuxtLink to="/dashboard/settings">{{ $t('settings') }}</NuxtLink>
        <NuxtLink to="/admin">{{ $t('admin') }}</NuxtLink>
      </nav>
    </aside>
    <main class="dashboard-main">
      <header class="dashboard-topbar">
        <span>{{ $t('dashboard') }}</span>
        <NuxtLink to="/logout">{{ $t('logout') }}</NuxtLink>
      </header>
      <slot />
    </main>
  </div>
</template>
