export default {
  content: [
    './app.vue',
    './components/**/*.{vue,js}',
    './composables/**/*.js',
    './layouts/**/*.vue',
    './middleware/**/*.js',
    './pages/**/*.vue',
    './plugins/**/*.js',
    './stores/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        storefront: {
          bg: '#f6f3ec',
          panel: '#ffffff',
          ink: '#191713',
          muted: '#776f63',
          accent: '#11684f',
          gold: '#b9852f',
        },
      },
      borderRadius: {
        storefront: '14px',
      },
      boxShadow: {
        storefront: '0 18px 60px rgba(42, 33, 20, 0.12)',
      },
      fontFamily: {
        storefront: ['Avenir Next', 'Segoe UI', 'Tahoma', 'sans-serif'],
        display: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
