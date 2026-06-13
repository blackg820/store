# Frontend Nuxt-Only Target

The final frontend target is a Nuxt app backed by Laravel `/api/v1`. The current production frontend remains Next.js until Nuxt reaches route, auth, dashboard, storefront, SEO, PWA, and deployment parity.

## Rules

- Nuxt source is JavaScript-only. Use `.js` and `.vue`; do not add `.ts` or `.tsx` files under `frontend-nuxt/` source.
- Laravel remains the source of truth for dashboard, storefront, Flutter, and Nuxt behavior.
- Public storefront routing is host-first for subdomains and custom domains. Do not make `/store/{slug}` the primary Nuxt storefront route.
- Store-scoped authenticated dashboard requests must send `X-Store-ID` only after validating the selected store.
- Frontend code must never expose Bunny, Telegram, Al-Waseet, push provider, or provider payload secrets.

## Implemented Nuxt Scaffolds

- JavaScript Nuxt config, ESLint config, Pinia stores, API plugin, SEO composable, and host tenant resolver.
- Auth routes and middleware: login, logout, profile, protected dashboard, and admin guard.
- Dashboard routes for overview, products, categories, orders, stores, and settings.
- Admin routes for overview, users, subscriptions, and operations.
- Storefront routes for host-resolved home, products, product detail, categories, and category detail.
- Arabic, English, and Kurdish locale files under `frontend-nuxt/locales/`.
- Storefront i18n uses no URL prefixes. Locale selection persists through `dokani_locale`/`dokani_locale_source`, while public routes remain host-based (`/`, `/products/{slug}`, `/categories/{slug}`).
- Storefront locale priority is: explicit user selection, store `default_language`/`defaultLanguage` from Laravel, supported browser language, then English.
- Storefront direction is applied to `<html>`: English is `ltr`; Arabic and Kurdish are `rtl`.
- PWA manifest/service worker generation through `@vite-pwa/nuxt`.

## Parity Work Before Cutover

- Replace placeholders with endpoint-backed tables, forms, drawers, and mutations.
- Migrate current Next dashboard workflows route by route.
- Migrate cart, checkout, customer notification opt-in, product media galleries, product options, and variant UX.
- Move auth toward HTTP-only cookies or a Laravel-backed SSR session bridge.
- Add browser smoke tests for host-resolved storefronts and dashboard authenticated flows.
- Keep root Next build green until Nuxt is deployed as the only frontend.
