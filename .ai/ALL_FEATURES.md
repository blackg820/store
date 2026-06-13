# All Project Features

Last updated: 2026-06-13

This document is the consolidated feature text for the Dokani/Storify project. It is based on the existing `.ai` memory, Laravel `/api/v1` routes/controllers, dashboard pages, public storefront pages, docs, and database notes.

## Project Summary

Dokani/Storify is a multi-tenant SaaS commerce platform for store owners, employees, platform admins, and public buyers. It currently combines a production Next.js dashboard/storefront frontend with a Laravel API backend, while a JavaScript-only Nuxt migration app lives in `frontend-nuxt/`. The Laravel `/api/v1` API is the source of truth for dashboard, Nuxt, and future Flutter behavior.

Core platform capabilities:

- Multi-tenant SaaS store management.
- Public storefronts with guest checkout.
- Product catalog, categories, product types, options, variants, and media.
- Orders, buyers, status management, and logistics handoff.
- Dynamic subscriptions, custom per-owner limits, and billing calculation.
- Platform admin management for users, plans, features, subscriptions, settings, and broadcasts.
- Telegram, Bunny CDN, Al-Waseet, realtime notifications, web/mobile push, and operations hooks.
- English, Arabic, and Kurdish localization patterns across the web UI.

## Frontend Transition To Nuxt

- Current production frontend remains Next.js until Nuxt reaches full route, auth, dashboard, storefront, SEO, PWA, and deployment parity.
- Future final frontend target is Nuxt under `frontend-nuxt/`.
- Nuxt source is JavaScript-only: use `.js` and `.vue`, with no `.ts` or `.tsx` source files under `frontend-nuxt/`.
- Nuxt uses Pinia stores for auth, tenant context, dashboard bootstrap, and notifications.
- Nuxt API access is centralized in `frontend-nuxt/plugins/api.js` and follows `docs/API_CLIENT_CONTRACT.md`.
- Nuxt storefront routing is host-first through Laravel `/api/v1/public/domain/resolve`; `/store/{slug}` must not become the primary Nuxt public route model.
- Nuxt scaffolds currently cover auth, profile/logout, dashboard overview/products/categories/orders/stores/settings, admin overview/users/subscriptions/ops, and storefront home/products/product detail/categories/category detail.
- Nuxt includes Arabic, English, and Kurdish locale files, SEO composable support, and PWA manifest/service-worker generation.
- Nuxt storefront i18n supports English (`en`), Arabic (`ar`), and Kurdish (`ku`) without URL prefixes.
- Nuxt storefront locale priority is explicit user selection, Laravel store `default_language`/`defaultLanguage`, supported browser language, then English fallback.
- Nuxt persists user-selected storefront locale in `dokani_locale` with `dokani_locale_source=user` and applies `<html lang>` plus `<html dir>`.
- English storefront UI renders LTR; Arabic and Kurdish render RTL.
- Nuxt auth currently mirrors tokens in cookies as a migration scaffold; production cutover should move to HTTP-only cookies or a Laravel SSR session bridge.

## User Roles

- `admin`: platform operator with global admin routes, user management, plans, subscriptions, settings, broadcast, audit views, and cross-tenant visibility where allowed.
- `store_owner`: tenant owner who owns one or more stores, manages catalog, orders, buyers, employees, billing, settings, integrations, and storefront configuration.
- `employee`: child account under a store owner. Employees inherit tenant access for catalog work and are intentionally blocked from sensitive areas such as orders, buyers, stores, billing, settings, employees, and admin pages.
- `public buyer`: unauthenticated storefront customer who browses stores/products and submits guest checkout orders.

## Authentication And Account Security

- Email/password login through `POST /api/v1/auth/login`.
- Sanctum access tokens and refresh tokens.
- Refresh token rotation through `POST /api/v1/auth/refresh`.
- Current user bootstrap through `GET /api/v1/auth/user`.
- Logout for current session through `POST /api/v1/auth/logout`.
- Revoke all sessions through `POST /api/v1/auth/logout-all`.
- Profile update through `PATCH /api/v1/profile`.
- Password update through `PATCH /api/v1/profile/password`.
- Inactive or suspended accounts are blocked from login and refresh.
- Password changes and admin/owner status changes revoke existing tokens.
- Frontend auth context handles silent refresh, token storage, logout cleanup, protected dashboard routes, and stale selected-store cleanup.

Known incomplete account features:

- Email password reset is not implemented.
- Security/audit events for account actions need stronger coverage.

## Tenant Isolation And Store Selection

- Tenant root is the store owner user.
- Employees inherit their parent store owner's tenant.
- Authenticated dashboard requests can carry `X-Store-ID`.
- `TenantMiddleware` validates the selected store against the authenticated admin/owner/employee tenant.
- Invalid selected stores return stable tenant denial codes such as `TENANT_ACCESS_DENIED` and `UNAUTHENTICATED_TENANT`.
- Frontend selected store is not trusted until validated against authenticated accessible stores.
- Owners/employees auto-select a valid active store where possible.
- Admins can use an all-store context or select a specific store.
- Safe GET requests retry once without stale `X-Store-ID` after tenant-header failures.

## Dashboard Shell

- Role-aware dashboard layout under `/dashboard`.
- Sidebar navigation for overview, stores, products, product types, orders, buyers, discounts, broadcast, billing, subscriptions, employees, settings, users, audit logs, API keys, and analytics.
- Shell topbar with main store selector, global dashboard search, sync/error indicator, and account controls.
- Shared dashboard page header component.
- Route-level dashboard loading and error states.
- Access-restricted states for unauthorized pages.
- Responsive dashboard UI components using Radix UI, Tailwind CSS, lucide icons, Sonner toasts, charts, tables, dialogs, drawers, and forms.

## Dashboard Bootstrap And Analytics

- `GET /api/v1/dashboard/init` provides the main dashboard payload.
- Payload includes role-scoped user, stores, products, orders, buyers, product types, categories, employees, subscriptions, audit logs, and settings where allowed.
- Employee bootstrap excludes sensitive orders/buyers/subscriptions data.
- `GET /api/v1/analytics/dashboard` provides dashboard analytics.
- Dashboard home has role-aware stats, quick actions, recent activity/order/catalog panels, and top-store summaries.

Known scaling risk:

- `dashboard/init` is a large unified payload and should eventually be split or paginated.

## Store Management

- Store list, create, edit, delete, and enter-store actions.
- Settings includes a store-domain management panel for subdomains, custom domains, DNS instructions, verification status, and removal.
- Store create/update through `/api/v1/stores`.
- Store details through `GET /api/v1/stores/{store}`.
- Store soft delete through `DELETE /api/v1/stores/{store}`.
- Store form options and slug availability checks.
- Store status update through `PATCH /api/v1/stores/{store}/status`.
- Open/close store controls through `POST /api/v1/stores/{store}/open` and `/close`.
- Toggle accepting orders through `POST /api/v1/stores/{store}/toggle-accepting-orders`.
- Store settings read/update through `GET/PATCH/PUT /api/v1/stores/{store}/settings`.
- Logo upload/delete through `/api/v1/stores/{store}/logo`.
- Cover upload/delete through `/api/v1/stores/{store}/cover`.
- Branding fields include logo URL, cover URL, bio/description, default language, theme/settings JSON, and social links.
- WhatsApp/contact data supports public storefront and checkout.
- Store owner-entered fields are canonical only; translated merchant-input columns should not be added.
- Store creation enforces subscription/custom `stores` limits.
- Employees cannot create, update, delete, or configure stores.

## Public Storefront

- Public store profile route: `/store/[slug]`.
- Host-based storefront routing supports subdomains and verified custom domains while preserving `/store/[slug]`.
- Reserved operational subdomains are protected from storefront rewrites.
- Storefront server rendering resolves `Host` first and uses the resolved host for canonical and Open Graph URLs.
- Public all-products route: `/store/[slug]/products`.
- Public all-categories route: `/store/[slug]/categories`.
- Public category-filter route: `/store/[slug]/category/[id]`.
- Product detail route: `/store/[slug]/product/[productId]`.
- Store subdomain product links are rewritten to canonical slug product routes.
- Public API store data through `GET /api/v1/public/store/{slug}`.
- Public API product data through `GET /api/v1/public/product/{id}?storeSlug={slug}`.
- Public settings through `GET /api/v1/public/settings`.
- Storefront renders cover image, logo/profile image, store name, description, status/open badge, checkout availability, categories, featured products, best sellers, trending/new arrival fallbacks, low-stock signals, and product cards.
- Storefront search and category filtering.
- Product quick view.
- Product detail gallery, option selection, variant-aware UX price/stock checks, related products, and sticky mobile CTA.
- Cart drawer with buyer form, phone, governorate, district, landmark/notes, and WhatsApp-friendly order copy.
- Guest checkout through `POST /api/v1/public/orders`.
- Public checkout blocks inactive stores, suspended owners, disabled checkout, inactive products, cross-store products, and invalid stock.
- Backend recalculates totals and remains authoritative for checkout.

Important rule:

- Orders are unlimited. SaaS plans must not block public or dashboard order creation by order count.

## Products

- Product list, create, edit, delete, search, filter, and dashboard table.
- Authenticated product API resource under `/api/v1/products`.
- Product form bootstrap through `GET /api/v1/products/form-options`.
- Product show validates tenant ownership.
- Product fields include store, category, product type, SKU/product code, title, description, price, cost price, discount, delivery fee, deposit requirement, status/active flag, custom data, media, options, and variants.
- Product discount supports final price calculation in API resources and storefront/dashboard UI.
- Product images/videos can be attached through product media or global media endpoints.
- Product Telegram post through `POST /api/v1/products/{product}/telegram`.
- Product creation enforces subscription/custom `products` limits.
- Employees can list/create/update products for the owner tenant.
- Employees cannot delete products or post products to Telegram.

## Product Media

- Product-scoped media endpoints under `/api/v1/products/{product}/media`.
- List product media.
- Upload product media.
- Delete product media.
- Reorder product media.
- Mark primary product media.
- Product-scoped media should be preferred for Flutter/dashboard product media behavior.
- Media resources support primary image state and metadata useful for Flutter.

## Product Types And Categories

- Product type API resource under `/api/v1/product-types`.
- Category API resource under `/api/v1/categories`.
- Store-specific and global product type/category rows.
- Nested categories through parent categories.
- Product type schema support for dynamic catalog structures.
- Active/inactive and sort-order support.
- Dashboard product-types page manages sections and sub-categories.
- Owners/employees can create/update tenant rows.
- Non-admin users can read but not mutate global rows.
- Employees cannot delete product type/category rows.
- Admins can manage global and store-specific catalog structure.

Known incomplete catalog feature:

- Complex product type schema validation/versioning is still light.

## Product Options And Variants

- Product options are embedded in product create/update payloads.
- Option fields include name, type, position, values, and color swatches.
- Variant fields include title, SKU, option values, price override, stock quantity, image reference, and active flag.
- Storefront product detail matches selected options to variants for UX price/stock feedback.
- Backend checkout remains authoritative for variant stock and pricing validation.

Known incomplete variant feature:

- Order items store selected options but do not store `variant_id`.

## Discounts

- Product-level discounts are stored on products and reflected in final price.
- Dashboard discounts page manages product discounts and store/global discount UI state.
- Storefront shows discount badges and uses discounts in display price calculations.
- Product detail applies product or store/global discount in the user experience.

Known limitation:

- Discount management is partly dashboard/data-context driven and does not appear to have a dedicated discount backend module.

## Orders

- Authenticated order list/create/show/update/delete under `/api/v1/orders`.
- Order status update through `PATCH /api/v1/orders/{order}/status`.
- Send order to Al-Waseet through `POST /api/v1/orders/{order}/alwaseet`.
- Public order creation through `POST /api/v1/public/orders`.
- Order fields include store, buyer, customer fields, status, totals, COD amount, delivery fee, notes, shipping/location data, Al-Waseet sync fields, and order items.
- Authenticated order creation supports idempotency.
- Order status tracking supports returned/problematic rejected-count behavior.
- Dashboard orders table supports filtering, search, time range, status updates, notes, and order management.
- Employees are denied authenticated order APIs.

Important rule:

- Do not add SaaS order limits. Orders may only be blocked by store, checkout, product, buyer, stock, validation, or integration rules.

## Buyers

- Buyer list/create/show/update under `/api/v1/buyers`.
- Buyer blacklist/unblacklist through `/api/v1/buyers/{buyer}/blacklist`.
- Buyers are scoped to the tenant owner by `user_id`.
- Same phone number can exist under different store owners.
- One owner should have only one buyer row per phone.
- Buyer data includes name, phone, email, notes, address, total orders, rejected orders, risk level, blacklist state, and blacklist reason.
- Dashboard buyers table supports search/filter and management.
- Employees are denied buyer APIs.
- `/buyers/auth` is intentionally unsupported; public checkout remains guest-first.

## Media And Bunny CDN

- Global authenticated media list/upload/delete/replace under `/api/v1/media`.
- Media can be scoped to store and optionally product.
- Non-admin global uploads are blocked without an authorized store.
- Upload validation supports image/video MIME allowlist and 50MB app-level validation.
- Storage quota enforces `storage_gb` subscription/custom limits.
- Local backup is written before Bunny upload.
- Bunny upload is backend-only.
- Media delete/replace removes local backup and queues Bunny remote cleanup for Bunny-backed media.
- Media resources hide provider secrets and raw sensitive data.

Important security rule:

- Never expose `BUNNY_API_KEY` or provider payload dumps.

## Billing, Plans, Features, And Subscriptions

- Public/custom billing calculation through `POST /api/v1/billing/calculate`.
- Current billing state through `GET /api/v1/billing/current`.
- Current usage through `GET /api/v1/billing/usage`.
- Checkout/manual handoff through `POST /api/v1/billing/checkout-session`.
- Dynamic features table with canonical feature codes:
  - `storage_gb`
  - `stores`
  - `employees`
  - `products`
  - `api_requests`
  - `telegram_bot`
  - `alwaseet_integration`
  - `custom_domain`
  - `premium_support`
- Custom per-owner limits in `user_limits`.
- Custom pricing supports base price plus unit prices for stores, products, employees, storage, Telegram bot, integrations, and domains.
- Admin user create/update can assign custom limits/pricing to store owners.
- Subscription service enforces store, employee, product, storage, Telegram, and Al-Waseet gates.
- Legacy order-limit concepts are deprecated and must not block orders.

Known incomplete billing features:

- Real payment provider/webhook fulfillment is not complete.
- Usage reset/rollup jobs need more work.
- Custom limit audit/history is needed for high-stakes billing edits.

## Employees

- Employee list/create/update/delete under `/api/v1/employees`.
- Store owners can manage their own employees.
- Employee accounts are created with `role=employee` and `parent_id` pointing to owner.
- Employee creation enforces `employees` subscription/custom limit.
- Employee password changes and inactive status revoke employee tokens.
- Platform admins manage tenant owner accounts through admin users, not the employees page.

Known incomplete employee feature:

- Fine-grained employee permission matrix is not explicit yet.

## Platform Admin

- Admin settings read/update under `/api/v1/admin/settings`.
- Admin broadcast through `POST /api/v1/admin/broadcast`.
- Admin users list/create/update/delete under `/api/v1/admin/users`.
- Admin user custom limit update through `PUT /api/v1/admin/users/{user}/limits`.
- Admin subscriptions list/create/update under `/api/v1/admin/subscriptions`.
- Admin features list/create/update under `/api/v1/admin/features`.
- Admin plans list/create/update under `/api/v1/admin/plans`.
- Admin plan feature matrix update through `PUT /api/v1/admin/plans/{plan}/features`.
- Dashboard users page for SaaS owner account management.
- Dashboard subscriptions page for platform subscription management.
- Dashboard broadcast page for global Telegram/store announcements.
- Dashboard audit logs page reads audit logs from dashboard bootstrap and can export CSV.
- Dashboard API keys page generates local-only keys in the browser.

Known admin limitations:

- Admin lists need pagination.
- Audit trails for admin plan/user/subscription changes need stronger backend coverage.
- API keys page is local-only and not backed by Laravel API-key endpoints.

## Telegram Integration

- Public Telegram webhook through `POST /api/v1/telegram/webhook`.
- Webhook secret header is enforced when `TELEGRAM_WEBHOOK_SECRET` is configured.
- Admin-only webhook setup through `POST /api/v1/telegram/setup-webhook`.
- Bot linking through `POST /api/v1/telegram/link-bot`.
- Store Telegram validation endpoints for bot/channel checks.
- Store Telegram settings through `GET/PATCH /api/v1/stores/{store}/telegram-settings`.
- Store Telegram test through `POST /api/v1/stores/{store}/telegram-settings/test`.
- Product post to Telegram through product endpoint.
- Order notifications can be sent through notification service.
- Platform-managed Telegram bot token stays backend-only.
- Store owners should configure chat/channel/thread/auto-post fields, not raw bot token.

Important security rule:

- Never expose Telegram tokens or raw provider payload dumps.

## Notifications, Realtime, And Push

- Dashboard notifications list through `GET /api/v1/notifications`.
- Unread count through `GET /api/v1/notifications/unread-count`.
- Mark one notification read through `POST/PATCH /api/v1/notifications/{notification}/read`.
- Mark all read through `POST/PATCH /api/v1/notifications/read-all`.
- Order-created listener writes dashboard notifications.
- Private realtime broadcast channel authorization for store channels.
- Device token list/create/delete through `/api/v1/device-tokens`.
- Browser push subscribe/unsubscribe through `/api/v1/push/subscribe` and `/api/v1/push/unsubscribe`.
- Push delivery job supports web/android FCM and iOS APNs when provider environment and queue workers are configured.
- Device token resources hide raw tokens.
- Customer marketing notification subscriptions, campaigns, delivery history, open tracking, and click tracking are available through enterprise customer notification APIs.
- Customer notification endpoints/keys are encrypted/hidden from store owners; campaign dispatch is queue-based.
- Dashboard customer-notification page supports campaign drafts, scheduling, queueing, and delivery stats.
- Public storefront notification opt-in supports browser permission, phone preference, unsubscribe, unsupported browsers, and denied permissions.

Known push limitation:

- Real push delivery depends on provider credentials and a running queue worker.

## Al-Waseet Logistics Integration

- Store Al-Waseet credentials/settings are encrypted and store-scoped.
- Al-Waseet settings read/update/test under `/api/v1/alwaseet/settings`.
- Al-Waseet reference data: cities, regions, package sizes, order statuses.
- Al-Waseet orders list/create/batch/edit.
- Al-Waseet invoices list, invoice orders, and receive invoice.
- Order handoff to Al-Waseet through `/api/v1/orders/{order}/alwaseet`.
- Integration is gated by `alwaseet_integration` and configured credentials.
- Background jobs sync statuses and push orders.

Important security rule:

- Never expose Al-Waseet credentials or raw provider payload dumps.

## Profile And Settings

- Dashboard settings page manages profile, password, store settings, Telegram, and Al-Waseet-related settings.
- Store profile fields include identity, contact, default language, logo/cover, social links, and notification/integration settings.
- Password change revokes sessions and logs the user out on the frontend.

## Localization And UI Language

- Locale files exist for English, Arabic, and Kurdish under `locales/`.
- Dashboard and storefront use locale helpers and auth language state.
- RTL behavior is supported for Arabic-oriented pages/components.
- Merchant-entered store/catalog fields remain canonical, not translated per language column.

## API Proxy And Public API Contract

- Frontend proxies `/api/v1/*` through `app/api/v1/[...path]/route.ts` to Laravel.
- Laravel API lives under `/api/v1`.
- Safe docs endpoint exists at `GET /api/v1/docs`.
- API responses generally follow `{ success, message, data }`.
- Error responses include stable codes such as `PLAN_LIMIT_REACHED`, `TENANT_ACCESS_DENIED`, and `UNAUTHENTICATED_TENANT`.
- API docs are maintained under `docs/`.

## Operations And Deployment

- Health endpoint: `GET /api/health`.
- Deep health endpoint: `GET /api/health/deep`, proxying Laravel deep checks.
- Laravel health endpoints: `GET /api/v1/ops/health` and `GET /api/v1/ops/health/deep`.
- Admin operations dashboard: `/dashboard/ops` backed by `GET /api/v1/admin/ops/summary`.
- Protected cleanup bridge: `GET/POST /api/cron/cleanup`.
- Protected queue worker bridge: `GET/POST /api/cron/worker`.
- Cron endpoints require `Authorization: Bearer $CRON_SECRET`.
- Production refuses cron execution if `CRON_SECRET` is missing.
- PM2 ecosystem config exists for frontend/backend/reverb/worker-style processes.
- Kubernetes manifests exist under `backend/k8s`.
- Laravel queues/jobs support background cleanup, notifications, Bunny deletion, Al-Waseet sync, and push.
- Daily analytics aggregation supports store, product, notification, and platform stats through `php artisan analytics:aggregate-daily`.
- Sanitized `system_events` capture tenant denials, auth failures, domain failures, provider failures, notification failures, push failures, aggregation failures, and slow analytics endpoints.
- Current production frontend is still Next.js. A separate Nuxt 3 migration skeleton exists under `frontend-nuxt/` but is not production-facing.
- Nuxt skeleton includes TypeScript, Pinia, Nuxt i18n, PWA placeholder config, API client plugin, auth/tenant stores, dashboard/storefront layouts, SEO helper, and host-based storefront tenant resolution proof.

## Database And Core Data Model

- Users: admins, store owners, employees.
- Stores: tenant storefronts and settings.
- Products: sellable items.
- Product options and variants: option definitions and stock/price combinations.
- Product types and categories: catalog structure.
- Media: store/product files with provider metadata.
- Buyers: owner-scoped customers.
- Global customers: phone-based cross-store risk profiles.
- Orders and order items: commerce orders and line items.
- Plans, features, plan features, subscriptions, subscription usages, usage records, usage rollups, feature overrides, and user limits: SaaS billing.
- Notifications, device tokens, push subscriptions: notification system.
- Customer notification subscriptions/campaigns/deliveries: marketing notification system.
- Analytics events and cached dashboard analytics: visit/product/checkout/campaign tracking plus owner/platform summaries.
- Daily aggregate analytics tables: store/product/notification/platform stats.
- Operations tables: sanitized system events and scheduler heartbeat.
- Analytics events: visit/product/checkout/campaign tracking.
- Al-Waseet reference tables: logistics data.
- Audit logs: entity action records.
- Laravel jobs/cache/tokens tables: framework runtime.

## Future Flutter Dashboard Readiness

- Flutter app is documented but not built in this repository.
- Flutter should consume existing Laravel `/api/v1` APIs.
- Flutter should validate accessible stores before sending `X-Store-ID`.
- Flutter product media should prefer `/products/{product}/media`.
- Flutter must not expose Bunny keys, Telegram bot token, Al-Waseet credentials, or raw provider payloads.
- Flutter should preserve role rules: admins global, owners tenant-scoped, employees catalog-only.
- Flutter should not introduce order SaaS limits.

## Known Local-Only Or Incomplete Areas

- API keys dashboard is local-only and has no backend API-key persistence.
- Nuxt skeleton is a migration target only; dashboard/storefront page parity is not implemented yet.
- Custom-domain DNS verification challenge/UI is not complete.
- Customer notification provider-specific delivery workers still need implementation after queued delivery rows are created.
- Raw analytics events have daily aggregation tables/jobs; production still needs scheduler monitoring and retention policy tuning.
- Discounts page does not appear to be backed by a dedicated discount backend module.
- Email password reset is missing.
- Fine-grained employee permissions are missing.
- Store settings/theme JSON validation should be stronger.
- Product type schema validation/versioning should be stronger.
- Order item `variant_id` persistence is missing.
- Admin lists need pagination.
- Audit events for sensitive account, billing, plan, and tenant actions need stronger backend support.
- Payment provider and webhook fulfillment are not complete.
- Usage reset/rollup jobs need completion.
- Push sending depends on environment credentials and queue workers.
- Tests may fail locally because SQLite PDO is missing in the PHP environment.

## Non-Negotiable Project Rules

- Laravel `/api/v1` is the source of truth for dashboard behavior.
- Product dashboard changes should preserve parity with `components/dashboard/products-table.tsx`.
- Product media for Flutter should prefer product-scoped endpoints under `/products/{product}/media`.
- Store-scoped dashboard requests should carry validated `X-Store-ID`; tenant denial codes must remain stable.
- Bunny uploads are backend-only.
- Never expose `BUNNY_API_KEY`, Telegram tokens, Al-Waseet credentials, or provider payload dumps.
- Orders remain unlimited. Do not add order SaaS limits.
- Keep API docs in `docs/` updated when contracts change.
