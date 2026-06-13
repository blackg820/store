# Nuxt 3 Migration Plan

## Frontend Audit

Current frontend framework: Next.js 16 App Router with React 19.

Nuxt status: a separate migration app exists at `frontend-nuxt/`. It is JavaScript-only: Nuxt source should use `.js` and `.vue` files, with no TypeScript source files in the Nuxt app.

Framework presence: both frameworks are now present, but only the root Next.js app is production-facing.

Production-facing app: the root Next.js app. Its scripts are `next dev`, `next build`, and `next start`; production routes live under `app/`, with middleware in `middleware.ts`.

## Existing Routes

Dashboard routes:

- `/dashboard`
- `/dashboard/analytics`
- `/dashboard/api-keys`
- `/dashboard/audit-logs`
- `/dashboard/billing`
- `/dashboard/broadcast`
- `/dashboard/buyers`
- `/dashboard/customer-notifications`
- `/dashboard/discounts`
- `/dashboard/employees`
- `/dashboard/ops`
- `/dashboard/orders`
- `/dashboard/product-types`
- `/dashboard/products`
- `/dashboard/settings`
- `/dashboard/stores`
- `/dashboard/subscriptions`
- `/dashboard/users`

Storefront routes:

- `/store/[slug]`
- `/store/[slug]/products`
- `/store/[slug]/categories`
- `/store/[slug]/category/[id]`
- `/store/[slug]/product/[productId]`
- Current host/subdomain middleware rewrites storefront hosts to `/store/{slug}`. Nuxt should move away from slug-primary routing and resolve by host first.

## Reusable Pieces

Reusable API logic:

- `lib/api-client.ts`: bearer auth, refresh retry, `X-Store-ID`, language headers, stale tenant recovery.
- `app/api/v1/[...path]/route.ts`: Next proxy pattern. Nuxt can either call Laravel directly server-side or use Nitro server routes as a proxy.

Reusable UI concepts:

- Dashboard shell, sidebar, topbar, selected-store selector, shared page header, access-restricted state.
- Storefront cart drawer, notification opt-in, product discovery patterns, product detail UX.
- DTO definitions in `lib/types.ts`.

Migration risk:

- React/Radix components are not directly portable to Vue.
- Dashboard state currently depends on a large unified data context.
- Storefront host routing must preserve custom-domain/subdomain behavior without exposing app routes.
- Auth tokens are currently stored in browser local storage; Nuxt SSR should prefer HTTP-only cookies when backend support is added.
- i18n keys exist in Next/React shape and need Vue/i18n normalization.
- PWA/service worker behavior must not double-register during parallel rollout.

## Target Folder Structure

```text
frontend-nuxt/
  app.vue
  nuxt.config.js
  assets/css/main.css
  components/
    dashboard/
    storefront/
    ui/
  composables/
    useSeo.js
    useTenantResolver.js
  layouts/
    dashboard.vue
    storefront.vue
  locales/
    ar.json
    en.json
    ku.json
  middleware/
    auth.js
    admin.js
  pages/
    index.vue
    dashboard/
    products/
    categories/
  plugins/
    api.js
  stores/
    auth.js
    dashboard.js
    notifications.js
    tenant.js
```

## Route Mapping

- Next `/dashboard/*` -> Nuxt `pages/dashboard/**` using `layouts/dashboard.vue`.
- Next `/store/[slug]` -> temporary compatibility route only, not primary.
- Storefront primary route -> Nuxt root host route, resolving the request `Host` through Laravel `/api/v1/public/domain/resolve`.
- Product listing/detail on subdomains/custom domains -> `/products` and `/products/[slug]`, resolved against current host tenant.
- Category listing/detail on subdomains/custom domains -> `/categories` and `/categories/[slug]`, resolved against current host tenant.

## Host-Based Storefront Routing

Nuxt should read the hostname server-side with `useRequestHeaders(['host'])` or Nitro event helpers. It should call Laravel `/api/v1/public/domain/resolve?host={host}` and render:

- Resolved tenant storefront when Laravel returns an active store.
- Store-not-found when Laravel returns `STORE_DOMAIN_NOT_FOUND`.
- Dashboard/login routes from the app domain only.

Do not make `/store/{slug}` the primary routing model in Nuxt.

## i18n

Use `@nuxtjs/i18n` with `ar` default, `en`, and `ku`. Keep Arabic/Kurdish RTL. Migrate static UI strings first; merchant-entered store/product data remains canonical and should not be translated into separate owner-input fields.

## PWA

Use `@vite-pwa/nuxt`. Start with manifest and registration only. Migrate push subscription UX after the storefront is stable, using the existing backend customer notification subscription endpoint.

## SEO

Use a shared `useSeo` composable. Storefront pages should derive title, description, canonical URL, and Open Graph image from resolved tenant/product data. Custom domains must generate canonical URLs from the resolved host.

## API Client

Use the documented API client contract in `docs/API_CLIENT_CONTRACT.md`. The Nuxt JavaScript plugin should support SSR-safe Laravel calls, bearer auth, refresh retry, tenant headers, validation error propagation, and no frontend secrets.

## Auth And Session

Phase 1 uses cookies mirroring the current token contract. Phase 2 should move to HTTP-only cookies or a backend session bridge for SSR. Store owners and employees must validate selected stores before sending `X-Store-ID`.

## Pinia State

- `auth`: user, access token, refresh token, refresh single-flight, logout.
- `tenant`: host-resolved storefront tenant and dashboard selected store.
- `dashboard`: bootstrap payload split into module stores as pages migrate.
- `cart`: storefront cart and checkout draft.
- `notifications`: dashboard unread count and customer opt-in state.

## Component Migration Strategy

1. Build Vue primitives for buttons, cards, dialogs, tables, forms, tabs, badges, sheets/drawers, and toasts.
2. Migrate layout components: dashboard layout, sidebar, topbar, store selector.
3. Migrate page-specific components one route at a time.
4. Keep DTOs and API response handling aligned with Laravel resources.
5. Avoid porting React implementation details directly when Vue composition is simpler.

## Dashboard Migration Order

1. Auth/login/session bootstrap.
2. Dashboard layout, sidebar, topbar, selected store.
3. Dashboard overview.
4. Products and product types, because employees depend on catalog routes.
5. Orders.
6. Stores and settings/domain panel.
7. Buyers.
8. Analytics and ops.
9. Billing/subscriptions/users/admin routes.
10. Customer notifications and integrations.

## Storefront Migration Order

1. Host tenant resolution proof.
2. Storefront profile/home page.
3. Product listing and category listing.
4. Product detail.
5. Cart drawer and public checkout.
6. Notification opt-in.
7. SEO/canonical polish.
8. PWA install/push behavior.

## Verification

- Keep the Next app building until Nuxt parity is proven.
- For Nuxt: `npm install`, `npm run lint`, `npm run build`.
- Nuxt local dev must use port 3001: `cd frontend-nuxt && npm run dev`.
- If port 3001 is busy, stop the process using it instead of allowing Nuxt to fall back to 3002: `lsof -i :3001`, then `kill -9 <PID>`.
- Confirm no Nuxt source TypeScript remains: `find frontend-nuxt -path 'frontend-nuxt/node_modules' -prune -o -path 'frontend-nuxt/.nuxt' -prune -o -path 'frontend-nuxt/.output' -prune -o -type f \( -name '*.ts' -o -name '*.tsx' \) -print`.
- For root app: `npx tsc --noEmit --pretty false`, `npm run lint -- --max-warnings=0`, `npm run build`.
- For backend contracts: `composer validate`, route list, migrate pretend, and feature tests when a test DB driver is available.

## Current Nuxt Slice Status

- `frontend-nuxt/` has been converted from the initial TypeScript skeleton to JavaScript-only Nuxt source.
- The app includes JavaScript Pinia stores for auth, tenant context, dashboard bootstrap, and notifications.
- The API plugin centralizes Laravel `/api/v1` access, bearer token headers, language headers, refresh retry, `X-Store-ID`, and tenant-denial cleanup.
- Host tenant resolution uses Laravel `/api/v1/public/domain/resolve` and treats host-resolved storefront routes as the primary public model.
- Storefront scaffolds exist for home, products, product details, categories, and category details.
- Dashboard scaffolds exist for overview, products, categories, orders, stores, and settings.
- Admin scaffolds exist for overview, users, subscriptions, and operations.
- SEO, i18n, PWA, and deployment notes are documented, but Next remains production-facing until Nuxt reaches route and interaction parity.
