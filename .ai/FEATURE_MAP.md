# Feature Map

Last updated: 2026-05-11

## Nuxt Frontend Migration

- Location: `frontend-nuxt/`.
- Purpose: future final Nuxt frontend for dashboard, admin, and host-resolved storefront behavior. Existing Next.js stays production-facing until parity.
- Language rule: JavaScript-only source. Use `.js` and `.vue`; do not add `.ts` or `.tsx` files under Nuxt source.
- Implemented areas:
  - Nuxt config, ESLint config, Pinia, i18n, PWA, shared CSS, layouts, and error page.
  - API client plugin with Laravel base URL config, bearer token header, `Accept-Language`, validated `X-Store-ID`, refresh retry, validation/status error propagation, and tenant-denial cleanup.
  - Auth store/login/logout/profile scaffold with cookie-backed migration tokens.
  - Tenant resolver composable using `/api/v1/public/domain/resolve?host=...`.
  - Dashboard scaffolds for overview, products, categories, orders, stores, and settings.
  - Admin scaffolds for overview, users, subscriptions, and operations.
  - Storefront scaffolds for host home, products, product detail, categories, and category detail.
  - SEO composable and JSON-LD/canonical patterns for storefront pages.
- Current verification: Nuxt `npm run lint` and `npm run build` pass; source `.ts/.tsx` check is empty when excluding `node_modules`, `.nuxt`, and `.output`.
- Remaining work: replace placeholders with endpoint-backed production workflows, migrate cart/checkout/customer notification opt-in, harden SSR auth with HTTP-only cookies/session bridge, add browser smoke tests, and cut over only after Next parity.

## Flutter Dashboard Client

- Location: Flutter app under `lib/`.
- Purpose: separate Storify Dashboard client for admins, store owners, and employees. It consumes Laravel `/api/v1` and does not replace the public storefront.
- Implemented areas:
  - Auth/session: login, logout, auth bootstrap, refresh token, profile update, password update with session revocation cleanup.
  - Store selector: validates persisted selected store against authenticated stores, auto-selects active owner/employee store, allows admin all-store context, clears selected store on tenant errors.
  - API client: normalized response parsing, bearer auth, language header, optional validated tenant header, multipart media upload, refresh retry, typed errors.
  - UI: dashboard shell, responsive nav, shared states/dialogs, theme, English/Arabic/Kurdish localization and RTL.
  - Pages: home, store selector, stores, products, product types/categories, orders, buyers, store settings, Telegram, notifications/device tokens, billing, media, admin.
  - Completion pass 2026-05-11: added product detail/options/variants JSON payload support, order create/detail/edit/delete, buyer create/detail, device-token management, and admin user create/edit.
  - Security: no bot token or integration credentials are exposed; tokens are not logged; order limits are not added.
- Remaining runtime work: authenticated API smoke testing with safe test credentials and mobile push sender validation after backend push sending exists.

## Backend Runtime Gap Closure From `.ai2`

- Push notifications: order-created listener writes a dashboard notification, queues device-token push delivery, and broadcasts on `private-store.{id}` with server-side channel ownership validation.
- Push delivery supports registered web/android FCM and iOS APNs device tokens when provider env/config and queue workers are available.
- Device-token APIs: `GET /notifications`, `PATCH /notifications/{notification}/read`, `POST /notifications/read-all`, `GET/POST/DELETE /device-tokens`.
- Media cleanup: media delete/replace removes local backups and queues Bunny remote cleanup for Bunny-backed media; queue workers are required for remote cleanup.
- Telegram: webhook secret is enforced when `TELEGRAM_WEBHOOK_SECRET` is configured; setup webhook is admin-gated and uses the backend-only secret token when configured.
- Buyer auth: `/buyers/auth` is intentionally unsupported; storefront checkout remains guest-first and no longer calls that endpoint.

`Skills.sh` was not found. Relevant skills are inferred from current stack and documented in `.ai/SKILLS.md`.

## Auth

- Purpose: authenticate dashboard/admin users and maintain API sessions.
- Files: `backend/routes/api.php`, `lib/auth-context.tsx`, `lib/api-client.ts`, `backend/app/Models/User.php`.
- APIs: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/user`, `POST /auth/logout`, `POST /auth/logout-all`.
- DB: `users`, `personal_access_tokens`.
- UI: root login screen, `/login` route, protected routes, dashboard layout.
- Permissions: role field (`admin`, `store_owner`, `employee`).
- Implementation note: login payload includes `parentId` and `subscriptionPlan`; auth context stores both for role/plan-aware dashboard UI. `/login` reuses the root login screen, protected dashboard redirects should use `/login`, login clears stale selected store state, and initial auth loading waits for silent refresh to finish. Logout calls the backend best-effort before clearing local tokens and selected-store state. `/auth/user` returns `UserResource`.
- Current behavior: inactive/suspended users cannot login or refresh tokens. Self password change revokes all Sanctum tokens and the settings UI logs out after success. Admin password changes or suspension revoke that user's tokens. Owner-managed employee password changes or inactive status revoke employee tokens.
- Known bugs/risks: password reset by email is not implemented yet; account security events still need audit logging.
- Improvement ideas: add logout route, token device list, password reset, rate limiting.

## Dashboard

- Purpose: owner/admin operational UI.
- Files: `app/dashboard/*`, `app/dashboard/error.tsx`, `app/dashboard/loading.tsx`, `components/dashboard/*`, `components/dashboard/access-restricted.tsx`, `lib/data-context.tsx`, `middleware.ts`.
- APIs: `/dashboard/init`, analytics, stores/products/orders/buyers/admin endpoints.
- DB: most domain tables.
- Permissions: scoped by admin, tenant owner, or employee inherited owner scope. Employees are restricted to `/dashboard/products` and `/dashboard/product-types`.
- Current behavior: dashboard landing is role-aware for admin and store owner. Employee dashboard entry redirects to products; employee accounts can only access products and product types/categories. Route-level loading and error fallbacks prevent blank dashboard pages during slow loads or client render failures. The shell topbar includes the single reusable main Store Selector, role-aware global search across products/categories/orders/stores, a small data sync/error indicator, and client-side router navigation for internal dashboard links.
- Actual UI structure: `app/dashboard/layout.tsx` wraps pages with `DashboardSidebar`, `ShellTopbar`, and a max-width main content area. Dashboard home composes a role-aware overview hero, quick actions, role-specific stats cards, recent order/catalog panels, and top stores. `components/dashboard/page-header.tsx` is now the shared header pattern for high-traffic dashboard pages, replacing several page-local oversized headers.
- Main dashboard sections: Overview, Commerce/Stores, Catalog/Products/Product Types, Orders/Buyers, Marketing/Discounts/Broadcast, Billing/Subscriptions, Employees, Settings/Integrations, Platform Admin users/audit/API keys.
- Implementation note: API client sends `X-Store-ID` only when an auth token exists. It clears stale `storify_selected_store_id` and retries safe GET requests once without `X-Store-ID` when backend returns `TENANT_ACCESS_DENIED` or `UNAUTHENTICATED_TENANT`. Token refresh is single-flight so parallel dashboard API calls do not rotate refresh tokens against each other. Data context waits for auth bootstrap before loading dashboard data, validates persisted selected store ids against authenticated accessible stores, auto-selects a first active owned store for owners/employees, clears stale dashboard state when no authenticated token exists, loads employee rows for store owners, and keeps detailed dashboard logs behind `NEXT_PUBLIC_DEBUG=true`.
- Known bugs/risks: `dashboard/init` returns large unified payload. Dashboard UI still has inconsistent table shells/forms on older pages, oversized rounded promotional styling in store/settings/billing/forms, hover-only row actions in some areas, browser `confirm()` dialogs in table components, and incomplete page-local empty/error states.
- Improvement ideas: split into paginated endpoints, server-side search, route-specific search result deep links, shared section/table components, consistent table toolbar/empty states, proper confirm dialogs, and role-aware upgrade/permission banners.

## Flutter Dashboard

- Purpose: future separate Flutter Dashboard app for store owners, platform admins, and supported employee catalog users.
- Files: `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`, `.ai/FLUTTER_DASHBOARD_BUILD_PROMPT.md`.
- Scope: build a new Flutter client only; do not replace the public storefront, do not rewrite Laravel backend, and do not modify the current Next storefront/dashboard unless explicitly required.
- API contract: consume existing `/api/v1` APIs and normalize inconsistent response envelopes in the Flutter API client.
- Store selector: after auth, load accessible stores from backend, validate persisted selected store locally against accessible stores, send `X-Store-ID` only after validation, clear invalid selected store on tenant errors, and auto-select newly created stores.
- Required app areas: Login, Dashboard Home, Store Selector, Stores, Products, Product Create/Edit, Categories/Product Types, Orders, Order Details, Buyers, Store Settings/Profile/Branding/Social, Telegram Settings, Notifications, Limits/Pricing, and SaaS Admin pages where APIs support them.
- Roles: admins can use all-store context and admin pages; store owners manage their owned stores; employees are catalog-only and should be blocked from orders/buyers/stores/billing/settings/admin pages.
- Telegram rule: store owners must never set or view Telegram bot token; platform-managed token is backend-only.
- Orders rule: no SaaS order limits. Orders may be blocked only by store/checkout/product/buyer/stock validation.
- Backend prerequisites: store status/defaultLanguage/bio/telegram resource alignment, notification list or realtime channel auth, FCM device endpoint if needed, buyer update/blacklist, store-owner custom limits in billing current, admin broadcast endpoint, media delete/replace.
- UI/i18n: follow `DESIGN.md`; dashboard should be clean SaaS UI, responsive for web/tablet/mobile, support AR/EN/KU, and keep all visible strings localized.
- Current status: documentation and prompt only. Flutter app has not been built.

## Stores

- Purpose: tenant storefront configuration, multi-store operations, store identity, public URL, notification settings, and integration setup.
- Files: `app/dashboard/stores/page.tsx`, `components/dashboard/stores-table.tsx`, `components/dashboard/main-store-selector.tsx`, `components/dashboard/shell-topbar.tsx`, `app/dashboard/settings/page.tsx`, `lib/data-context.tsx`, `lib/store-utils.ts`, `StoreController.php`, `StoreRequest.php`, `StoreResource.php`, `Store.php`, `TenantMiddleware.php`, `SubscriptionService.php`.
- APIs: `/stores`, `/stores/{store}`, `/stores/telegram/validate-bot`, `/stores/telegram/validate-channel`, `/media` for logo/cover uploads, `/telegram/link-bot` for bot linking.
- DB: `stores`, `users`, `media`, `products`, `orders`, `subscriptions`, `plan_features`.
- UI: `/dashboard/stores` is the main list/create/edit page; `/dashboard/settings` contains store-scoped Telegram/Al-Waseet settings driven by selected store context; `MainStoreSelector` in the shell topbar owns global store switching.
- Store selector behavior: authenticated owners/employees see only accessible owner stores, persisted ids are validated after auth/data load, invalid ids are cleared, owners/employees auto-select the first active owned store when needed, admins can use all-store context or select a store explicitly, and no selection attempt is made for unauthenticated users.
- Current flow: `/dashboard/stores` blocks employees, shows owner/admin StoresTable, filters/sorts stores client-side from the unified dashboard payload, creates stores through `addStore -> POST /stores`, edits through `updateStore -> PATCH /stores/{id}`, deletes through `deleteStore -> DELETE /stores/{id}` after alert-dialog confirmation, enters a store by setting selected store context and routing to dashboard/products/orders/settings, and opens public storefront URLs through `getStoreUrl`.
- Create/edit flow: component uses a three-step wizard for basics, appearance, and connections. Store owner-entered content is canonical only (`name`, `slug`, `description`); no translated store owner fields should be added.
- Permissions: admin or owner tenant access for create/update/delete; employees can read owner stores indirectly for product/category assignment but cannot create/update/delete stores or manage Telegram/store settings.
- Subscription rules: backend `SubscriptionService` enforces canonical `stores` limit on create. Frontend should show usage/upgrade guidance but must treat backend enforcement as source of truth.
- UI behavior: store list now uses responsive operational cards with quick stats, active/inactive filter, search by store/slug/owner, sort by newest/name/products/orders, plan capacity usage, clear upgrade warning when the store limit is reached, and visible store/product/order/settings actions.
- Known bugs/risks: theme/settings JSON validation should be stronger; pre-create logo/cover upload passes `storeId=0`, while `MediaController` blocks non-admin global uploads; the create/edit wizard and settings page still have heavier legacy visual styling and should be moved to shared form sections/drawers. Legacy `components/dashboard/header.tsx` is unused but now delegates to `MainStoreSelector`; remove it later if confirmed dead.
- Improvement ideas: store audit log, custom domains gated by `custom_domain`, full store settings sections for General/Branding/Domain/Integrations/Subscription/Team, server-side pagination/search for large tenant fleets, and store-scoped onboarding checklist.

## Products

- Purpose: catalog items.
- Files: `ProductController.php`, `Product.php`, `ProductResource.php`, `products-table.tsx`.
- APIs: `/products`, `/products/{product}`, `/products/{product}/telegram`.
- DB: `products`, `media`, `product_options`, `product_variants`.
- Permissions: admin, tenant owner, or employee inherited owner scope. Employees can create/update products for owner stores, but cannot delete products or post products to Telegram.
- Subscription rules: `products` limit on create; `telegram_bot` for posting.
- Current behavior: product form catalog selectors read product types/categories from the top-level data context instead of nested hook calls. Product edits send the validated store/category/type fields required by the backend, and color-option swatches are persisted through `swatches_json`.
- Known bugs/risks: variant stock only; imports not fully documented.
- Improvement ideas: bulk import enforcement and inventory audit.

## Product Types

- Purpose: dynamic catalog schema/type.
- Files: `ProductTypeController.php`, `CategoryController.php`, `ProductType.php`, `Category.php`, `ProductTypeResource.php`, `CategoryResource.php`, `DashboardController.php`, `app/dashboard/product-types/page.tsx`.
- APIs: `/product-types` resource, `/categories` resource, `/dashboard/init`.
- DB: `product_types`, `categories`.
- UI: `/dashboard/product-types`.
- Permissions: admins can manage global and store-specific rows; store owners and employees can create/update rows for stores owned by the tenant owner; employees cannot delete product type/category rows; non-admin users can view but not mutate global catalog rows.
- Current behavior: dashboard bootstrap loads owner/global catalog rows explicitly, bypassing unsafe global-scope side effects. The product-types page memoizes role-scoped stores, avoids unstable effect dependencies, and supports sub-category editing. Owner input fields are canonical only (`name`, not translated variants).
- UI note: product-types page now has a shared dashboard page header, local section/sub-category search, scoped counts, and an explicit empty state for no matching sections.
- Known bugs/risks: schema/custom field validation remains light and should be formalized before exposing complex product-type builders.
- Improvement ideas: formal schema validation and versioning.

## Product Options And Variants

- Purpose: product option definitions and SKU/price/stock combinations.
- Files: `ProductOption.php`, `ProductVariant.php`, `ProductController.php`, `products-table.tsx`.
- APIs: embedded in product create/update payloads.
- DB: `product_options`, `product_variants`.
- Permissions: inherited from product/store.
- Known bugs/risks: public checkout stores selected options but not variant id. Product detail now matches selected options to variants for UX price/stock checks, but backend checkout remains authoritative.
- Improvement ideas: store `variant_id` on order items.

## Orders

- Purpose: order intake and management.
- Files: `OrderController.php`, `PublicController.php`, `Order.php`, `OrderItem.php`, `OrderResource.php`, `orders-table.tsx`.
- APIs: `/orders`, `/orders/{order}`, `/orders/{order}/status`, `/public/orders`.
- DB: `orders`, `order_items`, `buyers`, `products`.
- Permissions: admin or tenant owner. Employees are denied authenticated order APIs.
- Subscription rules: none. Orders must never be blocked by SaaS plan/limit quantity.
- Buyer behavior: buyers are scoped to tenant owner by `user_id`; the same phone can exist under different store owners, but one owner should have only one buyer per phone.
- Known bugs/risks: authenticated order create supports single product shape; public checkout stronger but needs phone/address validation.
- Improvement ideas: order audit events and variant id persistence.

## Subscriptions And Billing

- Purpose: dynamic SaaS monetization.
- Files: `SubscriptionService.php`, `BillingController.php`, `AdminController.php`, billing migrations, `SubscriptionSeeder.php`.
- APIs: `/billing/*`, `/admin/features`, `/admin/plans`, `/admin/subscriptions`, `/admin/users`.
- DB: `user_limits`, `features`, `plans`, `plan_features`, `subscriptions`, `subscription_usages`, `usage_records`, `usage_rollups`, `subscription_feature_overrides`.
- Permissions: current customer for billing current/usage; admin for plan builder.
- Current behavior: `/billing/calculate` supports custom per-user limits with base price plus unit prices. `/billing/checkout-session` still resolves an active legacy plan when used and returns a provider redirect when `BILLING_CHECKOUT_URL` is configured, otherwise returns a manual approval/WhatsApp handoff payload. Admin user creation/update can assign custom limits/pricing to store owners.
- Known bugs/risks: real payment provider/webhook fulfillment is still needed; usage reset/rollup jobs and custom limit audit history are needed.
- Implementation note: active subscription lookup caches only the subscription id and hydrates a fresh model to avoid stale serialized Eloquent objects returning `__PHP_Incomplete_Class`.
- Improvement ideas: Stripe handoff, invoices, audit log, entitlement cache invalidation.

## Employees

- Purpose: tenant staff accounts.
- Files: `EmployeeController.php`, `User.php`, `employees-table.tsx`, `app/dashboard/employees/page.tsx`, `components/dashboard/sidebar.tsx`.
- APIs: `/employees`.
- DB: `users.parent_id`.
- Permissions: store owner can manage employees; employees cannot manage employees; platform admins manage tenant owner accounts and subscriptions from Users/Billing instead of the Employees page.
- Subscription rules: `employees` limit.
- Known bugs/risks: fine-grained employee permissions are not yet explicit.
- Improvement ideas: role permissions matrix and store-level assignments.

## Permissions

- Purpose: protect platform/admin/tenant actions.
- Files: `TenantMiddleware.php`, `AppServiceProvider.php`, model traits, controllers.
- APIs: all authenticated routes.
- DB: `users.role`, `users.parent_id`, `stores.user_id`.
- Known bugs/risks: some controllers still manually check ownership instead of policies.
- Implementation note: `TenantMiddleware` is global, so it resolves the Sanctum bearer token itself before route auth has populated `request->user()` and then verifies `X-Store-ID` ownership/admin access. This fixes false `UNAUTHENTICATED_TENANT` errors for valid selected-store requests.
- Improvement ideas: add policies/FormRequests for core resources.

## Media And Uploads

- Purpose: product/store media upload/listing.
- Files: `MediaController.php`, `Media.php`, `lib/bunny-cdn.ts`.
- UI/i18n: `components/dashboard/products-table.tsx`, `locales/*/common.json`.
- APIs: `GET/POST /media`, `DELETE /media/{media}`, `POST /media/{media}/replace`.
- DB: `media`.
- Permissions: tenant ownership; non-admin global uploads blocked.
- Subscription rules: `storage_gb`; if legacy plan data is missing this custom-limit feature, `SubscriptionService` falls back to default per-user storage limits instead of returning `FEATURE_DISABLED`.
- Known bugs/risks: quota reservation not fully transactional with storage write; deployment PHP/proxy upload-size settings must stay aligned with the 50MB app validation.
- Improvement ideas: media service, async cleanup, direct Bunny path per tenant, Redis/MySQL reservation lock before large uploads.

## Telegram Bot System

- Purpose: bot validation, product posting, order notifications.
- Files: `TelegramController.php`, `TelegramService.php`, `NotificationService.php`, `telegram-worker.ts`.
- APIs: `/telegram/*`, store validation endpoints, product Telegram post, `GET/PATCH/POST /stores/{store}/telegram-settings[/test]`.
- DB: store Telegram fields.
- Permissions: tenant owner/admin.
- Subscription rules: `telegram_bot`.
- Known bugs/risks: webhook secret is only enforced when `TELEGRAM_WEBHOOK_SECRET` is configured; environments without it are accepted for compatibility and log a warning.
- Improvement ideas: per-store webhook secret, idempotency, retry queues.

## Notifications And Flutter Push Readiness

- Purpose: Flutter dashboard notification polling, order-created dashboard notifications, and mobile device-token registration.
- Files: `NotificationController.php`, `DeviceTokenController.php`, `DashboardNotification.php`, `DeviceToken.php`, `NotificationResource.php`, `DeviceTokenResource.php`, `routes/channels.php`.
- APIs: `GET /notifications`, `PATCH /notifications/{notification}/read`, `POST /notifications/read-all`, `GET/POST/DELETE /device-tokens`.
- DB: `notifications`, `device_tokens`.
- Permissions: tenant store owner/admin; device tokens belong to authenticated user and optional owned store.
- Current behavior: order-created listener writes a dashboard notification, queues device-token push delivery, and broadcasts on `private-store.{id}` with server-side channel ownership validation.
- Known bugs/risks: push delivery requires FCM/APNs provider env and a running queue worker; raw device tokens remain hidden from resources/logs.

## Delivery And Logistics Integration

- Purpose: Al-Waseet shipment/order/invoice integration.
- Files: `AlWaseetController.php`, `AlWaseetService.php`, `AlWaseetManager.php`, `EnsureStoreHasAlWaseet.php`, `EnsureUserHasPlan.php`, `alwaseet-settings.tsx`.
- APIs: `/alwaseet/*`, `/orders/{order}/alwaseet`.
- DB: store encrypted credentials, Al-Waseet reference tables, order sync fields.
- Permissions: tenant owner/admin with configured credentials.
- Subscription rules: `alwaseet_integration`.
- Known bugs/risks: tests fail due missing SQLite PDO; token isolation tests exist.
- Improvement ideas: monitor failed sync jobs and token refresh audit.

## SaaS Owner/Admin System

- Purpose: platform-wide admin control.
- Files: `AdminController.php`, admin dashboard pages, `users-table.tsx`, `subscriptions-table.tsx`.
- APIs: `/admin/*`, including admin-only `POST /admin/broadcast`.
- DB: users, plans, features, subscriptions, settings.
- Permissions: `can:admin`.
- Known bugs/risks: admin lists need pagination/auditing.
- Improvement ideas: audit trails for plan/user/subscription changes.

## Storefront

- Purpose: public customer shopping experience.
- Files: `app/store/[slug]/page.tsx`, `app/store/[slug]/products/page.tsx`, `app/store/[slug]/categories/page.tsx`, `app/store/[slug]/category/[id]/page.tsx`, `app/store/[slug]/storefront-data.ts`, `components/store/storefront-client.tsx`, `components/store/cart-drawer.tsx`, `app/store/[slug]/loading.tsx`, product detail pages, `PublicController.php`, `ProductResource.php`.
- APIs: `/public/store/{slug}`, `/public/product/{id}`, `/public/orders`.
- DB: stores/products/categories/product types/media/buyers/orders.
- Permissions: public but server-authoritative.
- Current layout: store routes server-fetch public store data, metadata/site settings, and section data through `storefront-data.ts`, then hydrate `StorefrontClient`. The client renders a clean light profile-style storefront using `DESIGN.md` as the UI reference: sticky compact header, `coverUrl` cover image, centered circular `logoUrl` profile image, store name/description/status badge, product/category count strip, limited category chips/cards, limited featured products, best-sellers when API data exists, new-arrival fallback sections, all-categories route, all-products route, category-products route, quick-view option modal, footer, WhatsApp contact, and mobile sticky cart bar.
- Data flow: `PublicController@store` returns store branding/status fields (`logoUrl`, `coverUrl`, `bio`, `status`, `isOpen`, `checkoutEnabled`), products with category/product type ids and slugs, categories, productTypes, and `sections` (`featuredProducts`, `bestSellers`, `trendingProducts`, `categoriesWithCounts`, `lowStockProducts`, `reviewsSummary`). The StorefrontClient uses `logoUrl` and `coverUrl` for branding and ignores old profile/cover alias names on the frontend. Public checkout blocks when the store is not active or `checkout_enabled` is false; it still never enforces SaaS order limits.
- Product discovery behavior: default profile view shows limited products; `/store/[slug]/products` shows all active products; `/store/[slug]/categories` shows all categories; `/store/[slug]/category/[id]` opens the all-products view filtered by the matching category/product type id/key/slug; search works with the selected category; clear filters restores all active products.
- Performance behavior: store routes use short `revalidate: 60` with a storefront tag; shared data helper prevents route-fetch drift; cart drawer can receive already-loaded store contact data to avoid a duplicate store fetch; Bunny media URLs receive width hints where available.
- Known bugs/risks: checkout must remain server-calculated because product card/cart prices are only UX estimates; category route falls back to all products when an invalid category id is supplied.
- Product detail behavior: `/store/[slug]/product/[productId]` is the canonical product detail route, and store subdomain `/product/[productId]` reaches it through `middleware.ts` rewrite. The server route fetches `/public/store/{slug}` and `/public/product/{id}?storeSlug={slug}` before hydration, builds subdomain-aware metadata, and passes plain route params plus initial store/product data to the existing product-detail client. The client normalizes nullable public product DTO fields, keeps a slug-scoped fallback fetch, light storefront palette, locale-backed labels, gallery, options, variant price/stock checks, cart add, related products, footer, and sticky mobile CTA.
- UI rules: future storefront UI changes must read `DESIGN.md` first, preserve the simple light profile-style layout unless dark mode is explicitly requested, keep visible labels translated, and avoid duplicating filtering logic across dedicated routes.
- Improvement ideas: product slug URLs, real review/social-proof data, storefront cache invalidation tags, and stronger post-order confirmation.

## Operations And Health

- Purpose: production health checks, admin operations visibility, and protected maintenance/worker triggers.
- Files: `app/api/health/route.ts`, `app/api/health/deep/route.ts`, `app/api/cron/cleanup/route.ts`, `app/api/cron/worker/route.ts`, `app/dashboard/ops/page.tsx`, `backend/app/Http/Controllers/Api/OpsController.php`, `backend/app/Services/SystemEventService.php`, `ecosystem.config.js`.
- APIs: `GET /api/health`, `GET /api/health/deep`, `GET /api/v1/ops/health`, `GET /api/v1/ops/health/deep`, `GET /api/v1/admin/ops/summary`, `GET/POST /api/cron/cleanup`, `GET/POST /api/cron/worker`.
- Permissions: cron endpoints require `Authorization: Bearer $CRON_SECRET`; production refuses to run if `CRON_SECRET` is missing.
- Main flows: health checks Next uptime and Laravel `/up`; deep health checks DB/cache/queue/storage/Bunny config/scheduler heartbeat; admin ops shows failed/pending jobs, notification/provider/security failures, storage bytes, recent sanitized events, and aggregation heartbeat; cleanup prunes expired Sanctum tokens and old failed jobs; worker runs one Laravel queue cycle.
- Known bugs/risks: HTTP-triggered worker cycles are backup/ops hooks only; PM2 worker and scheduler remain the continuous processing path. Scheduler heartbeat only becomes healthy once cron is installed.
- Improvement ideas: add queue backend native depth metrics for Redis/SQS and provider-specific Telegram delivery status records.

## Analytics Aggregation And Readiness

- Purpose: reduce dashboard raw-query pressure and add daily platform/store/product/notification rollups.
- Files: `backend/database/migrations/2026_06_13_000002_add_production_readiness_tables.php`, `backend/app/Services/AnalyticsAggregationService.php`, `backend/app/Jobs/AggregateDailyAnalytics.php`, `backend/app/Console/Commands/AggregateDailyAnalyticsCommand.php`, daily stat models, `backend/routes/console.php`, `AnalyticsController.php`.
- APIs/commands: `php artisan analytics:aggregate-daily --date=...`, `--from`, `--to`, `--store`, `--retention-days`; dashboard analytics uses aggregate rows for dated ranges when present.
- DB: `store_daily_stats`, `product_daily_stats`, `notification_daily_stats`, `platform_daily_stats`.
- Queue: `analytics`, tries 3, backoff 120/600/1800 seconds.
- Scheduler: daily at `02:15`; backfill command also prunes raw `analytics_events` older than retention.
- Known bugs/risks: aggregate rows are only as current as the scheduler/backfill; raw query fallback remains necessary during rollout.

## Production Verification Tooling

- Purpose: make lint/testing requirements explicit and runnable.
- Files: `eslint.config.mjs`, `package.json`, `package-lock.json`, `backend/.env.testing.example`, `docs/LOCAL_TESTING.md`, `docs/PRODUCTION_READINESS.md`.
- Commands: `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `composer validate`, `php artisan route:list --path=api/v1`, `php artisan migrate --pretend`, `php artisan test`.
- Known environment issue: PHP tests are blocked in this container by missing `pdo_sqlite`; use documented SQLite extension or a dedicated test DB.

## Nuxt 3 Migration Target

- Purpose: future frontend migration target while preserving the existing production Next.js app.
- Files: `frontend-nuxt/*`, `docs/NUXT_MIGRATION_PLAN.md`, `docs/API_CLIENT_CONTRACT.md`.
- Current framework state: production frontend is Next.js 16 App Router; Nuxt did not exist before the launch-readiness slice and is now isolated under `frontend-nuxt/`.
- Skeleton features: Nuxt 3, TypeScript, Pinia, Nuxt i18n, PWA placeholder, API client plugin, auth store placeholder, tenant/domain resolver composable, dashboard/storefront layouts, error page, SEO helper, env example.
- Host routing proof: root Nuxt page reads request host server-side, calls Laravel `/api/v1/public/domain/resolve`, stores tenant context in Pinia, renders store-not-found when missing, and avoids `/store/{slug}` as primary routing.
- Verification: `npm install`, `npm run lint`, and `npm run build` pass inside `frontend-nuxt/` on this machine. The Nuxt source `.ts/.tsx` check is empty when excluding `node_modules`, `.nuxt`, and `.output`. npm warns current Node is `v20.19.5` while one dependency wants Node `>=22`; production docs require Node 22+.
- Risks: React/Radix components need Vue replacements; auth/session should move toward SSR-safe cookies; PWA/service worker must not conflict during parallel rollout; route parity is not complete.

## AI Documentation System

- Purpose: permanent project memory for future agents.
- Files: `.ai/*`.
- Rule: after every meaningful code change, update related `.ai` docs and append changelog.

## Enterprise Domain, Risk, Notifications, Analytics Upgrade

- Purpose: additive enterprise foundation for subdomain/custom-domain storefronts, global phone-based customer risk, customer marketing notifications, and expanded analytics.
- Files: `DomainTenantService.php`, `CustomerRiskService.php`, `DomainController.php`, `CustomerNotificationController.php`, `DispatchCustomerNotificationCampaign.php`, `AnalyticsController.php`, `StoreController.php`, `PublicController.php`, `OrderController.php`, `middleware.ts`, migration `2026_06_13_000001_add_enterprise_domain_customer_notification_analytics_tables.php`.
- APIs: `GET /public/domain/resolve`, `GET /stores/check-domain`, `POST /public/analytics/events`, public customer notification subscribe/unsubscribe/open/click endpoints, authenticated customer notification subscriptions/campaigns/deliveries endpoints, expanded `GET /analytics/dashboard`.
- DB: store `subdomain`, `custom_domain`, `domain_verified_at`; `global_customers`; buyer/order `global_customer_id`; customer notification subscriptions/campaigns/deliveries; `analytics_events`; extra performance indexes.
- Domain behavior: existing `/store/{slug}` remains supported; Next middleware rewrites non-reserved subdomains/custom hosts into the storefront; Laravel resolves verified custom domains and subdomains through cache-backed `DomainTenantService`; reserved operational subdomains bypass storefront rewrites.
- Customer risk behavior: global customer identity is normalized by phone. Rejections move risk from `normal` to `warning` to `high_risk`; risk is visible on buyer/order resources and never automatically blocks orders.
- Notification behavior: stores can create campaigns only for their own store; device endpoints/keys are encrypted/hidden; dispatch is queue-based and delivery rows track queued/delivered/opened/clicked states.
- Analytics behavior: owner analytics now includes order, revenue, product, customer, traffic, notification, and placeholder Telegram metrics; admins receive platform users/stores/orders/infrastructure summaries.
- 2026-06-13 hardening pass: storefront server data now resolves the request host through `/public/domain/resolve` before falling back to slug compatibility; store/product metadata uses resolved hosts for canonical/Open Graph URLs; Settings has a Domains tab; Orders table/detail display risk/rejection badges; `/dashboard/customer-notifications` manages drafts/scheduled campaigns and delivery stats; storefront footer has a non-intrusive notification opt-in; analytics page now consumes `/analytics/dashboard`; chart/top-product analytics queries use short cache keys by tenant/store/range.
- Known bugs/risks: custom-domain DNS verification challenge/admin approval is still manual/pending; provider-specific campaign delivery workers are not implemented; raw analytics events need aggregation/retention jobs at high volume; audit log expansion is still pending.
