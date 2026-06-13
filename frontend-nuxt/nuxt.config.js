export default defineNuxtConfig({
  compatibilityDate: '2026-06-13',
  devtools: { enabled: true },
  experimental: {
    appManifest: false,
  },
  features: {
    inlineStyles: false,
  },
  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@vite-pwa/nuxt', '@nuxtjs/tailwindcss'],
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  css: ['~/assets/css/main.css'],
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: false,
  },
  runtimeConfig: {
    internalApiBaseUrl: process.env.NUXT_INTERNAL_API_BASE_URL || process.env.NUXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000',
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
      rootDomain: process.env.NUXT_PUBLIC_ROOT_DOMAIN || 'blackt.uk',
      dashboardHost: process.env.NUXT_PUBLIC_DASHBOARD_HOST || 'dashboard.blackt.uk',
      useSubdomains: process.env.NUXT_PUBLIC_USE_SUBDOMAINS === 'true',
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Dokani',
    },
  },
  i18n: {
    restructureDir: '.',
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json', dir: 'ltr' },
      { code: 'ar', name: 'العربية', file: 'ar.json', dir: 'rtl' },
      { code: 'ku', name: 'کوردی', file: 'ku.json', dir: 'rtl' },
    ],
    langDir: 'locales',
    detectBrowserLanguage: false,
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Dokani',
      short_name: 'Dokani',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#111827',
    },
    workbox: {
      navigateFallback: '/',
    },
    client: {
      installPrompt: false,
    },
    devOptions: {
      enabled: false,
    },
  },
})
