# Bugs And Risks

Last updated: 2026-05-11

## Flutter Dashboard Risks

1. Severity: Critical
   Location: Flutter Dashboard API integration, `TenantMiddleware.php`, store-scoped APIs
   Explanation: A future Flutter Dashboard must validate selected stores after authentication and must not trust persisted local store ids.
   Why it matters: Sending an arbitrary or stale `X-Store-ID` can cause tenant denial errors and, if backend checks regress, cross-tenant exposure.
   Suggested fix: Implement the Store Selector exactly as documented in `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`; backend remains source of truth.

2. Severity: Critical
   Location: `StoreController`, `StoreRequest`, `StoreResource`
   Explanation: Store settings fields needed by Flutter are incomplete or inconsistent: status/open-closed, defaultLanguage, bio, telegramChannelId response, telegramAutoPost, and partial settings updates.
   Why it matters: Flutter settings/profile/Telegram screens would appear to save fields that are ignored or not returned.
   Suggested fix: Align request validation, controller mapping, resource response, and tests before depending on these fields.

3. Severity: High
   Location: `OrderCreated`, `routes/channels.php`, broadcast config
   Explanation: `OrderCreated` broadcasts on `private-store.{id}`, but channel authorization only exists for `App.Models.User.{id}` and broadcasting defaults to `null` unless configured.
   Why it matters: Flutter realtime order notifications cannot be trusted until the backend realtime contract is fixed.
   Suggested fix: Add store channel authorization and document Reverb/Pusher client settings, or build a polling endpoint/fallback first.

4. Severity: High
   Location: Telegram webhook
   Explanation: Setup webhook is admin-gated according to `.ai2`, but public webhook secret validation depends on `TELEGRAM_WEBHOOK_SECRET` being configured.
   Why it matters: Public webhook exposure is only hardened in environments where the secret is set and webhook setup has been rerun.
   Suggested fix: Set `TELEGRAM_WEBHOOK_SECRET` in every public environment and rerun admin webhook setup.

5. Severity: Medium
   Location: Push/media queue workers
   Explanation: `.ai2` documents queued push delivery and Bunny cleanup, but these depend on queue workers and provider configuration.
   Why it matters: Without workers, push delivery and CDN cleanup lag even though API writes remain consistent.
   Suggested fix: Run `notifications` and `media` queue workers and monitor failed jobs.

6. Severity: Medium
   Location: Current frontend references
   Explanation: Current web code references missing endpoints (`POST /admin/broadcast`, `POST /buyers/auth`, `/api/v1/docs`) and local-only API key management.
   Why it matters: Future Flutter work may accidentally assume these APIs exist.
   Suggested fix: Treat them as backend prerequisites unless implemented and documented.

## Critical

1. Severity: Critical
   Location: `TenantMiddleware.php`, model scopes, controller ownership checks
   Explanation: Tenant isolation depends on correct owner/employee resolution everywhere.
   Why it matters: Cross-tenant data exposure is SaaS-fatal.
   Suggested fix: Add centralized TenantContext and policies for every tenant model.
   Files likely involved: middleware, policies, controllers, models.

2. Severity: Critical
   Location: `PublicController@submitOrder`
   Explanation: Public checkout must remain server-authoritative for product ownership, stock, and pricing.
   Why it matters: Buyers can tamper with client payloads.
   Suggested fix: Add full checkout feature tests and variant id persistence.
   Files likely involved: `PublicController.php`, `OrderItem`, tests.

3. Severity: Critical
   Location: Auth password-reset/account security lifecycle
   Explanation: Login, refresh, logout, logout-all, password-change revocation, and suspension revocation exist, but email password reset and audit logging are not implemented.
   Why it matters: Stale tokens can persist after sensitive events.
   Suggested fix: Implement password reset by email, revoke tokens during reset completion, and audit account-security events.
   Files likely involved: `routes/api.php`, auth context, profile/admin controllers.

4. Severity: Critical
   Location: DB migrations/tests
   Explanation: `php artisan test` fails because SQLite PDO driver is missing.
   Why it matters: Backend tests cannot validate CI locally.
   Suggested fix: Install SQLite PDO in environment or configure tests to MySQL.
   Files likely involved: PHPUnit config/env, CI image.

5. Severity: Critical
   Location: Billing checkout
   Explanation: `/billing/checkout-session` returns provider-not-configured.
   Why it matters: Paid self-serve billing cannot complete.
   Suggested fix: Implement Stripe-compatible provider adapter.
   Files likely involved: `BillingController.php`, new provider service.

## High

6. Severity: High
   Location: `DashboardController@init`
   Explanation: Large unified payload loads many resources at once.
   Why it matters: Performance and memory degrade with tenant growth.
   Suggested fix: Split into paginated endpoints and cache summaries.

7. Severity: High
   Location: `SubscriptionService`
   Explanation: Usage reset/rollup jobs are incomplete.
   Why it matters: Metered billing and monthly limits can drift.
   Suggested fix: Add scheduled rollup/reset jobs with idempotency.

8. Severity: High
   Location: `AdminController`
   Explanation: Admin lists are not consistently paginated.
   Why it matters: Platform admin can slow down at scale.
   Suggested fix: Add pagination/filtering to users/subscriptions/plans/features.

9. Severity: High
   Location: `MediaController@store`
   Explanation: Quota check is not a true reservation around storage write.
   Why it matters: Concurrent uploads can exceed plan storage.
   Suggested fix: Use Redis/MySQL locks and commit usage after write.

10. Severity: High
    Location: Al-Waseet services
    Explanation: Token isolation is tested, but tests cannot run in this environment.
    Why it matters: Cross-store logistics token leakage would be severe.
    Suggested fix: Restore test environment and run suite in CI.

11. Severity: High
    Location: Legacy Next-side DB/queue/storage helpers in `lib/`
    Explanation: Laravel should be source of truth; legacy helpers can confuse future work.
    Why it matters: Split brain data paths cause bugs.
    Suggested fix: Quarantine, document, or remove after confirming unused.

12. Severity: High
    Location: Storefront caching
    Explanation: Public store fetch currently lacks production cache strategy.
    Why it matters: High traffic storefronts can overload backend.
    Suggested fix: Cache by store tag and invalidate on product/store changes.

13. Severity: High
    Location: Order item schema
    Explanation: Selected variant id is not persisted, only options JSON.
    Why it matters: Fulfillment/inventory audit is weaker.
    Suggested fix: Add `variant_id` to order_items.

14. Severity: High
    Location: Plan feature code changes
    Explanation: Admin can update feature code.
    Why it matters: Feature gates depend on canonical codes.
    Suggested fix: Protect canonical feature codes or require migration path.

15. Severity: High
    Location: API error handling
    Explanation: Standard response format is partial.
    Why it matters: Frontend upgrade/error UX can be inconsistent.
    Suggested fix: enforce response macros/resources globally.

## Medium

16. Severity: Medium
    Location: Product type/category controllers
    Explanation: Global vs store-scoped records need clearer policy.
    Suggested fix: Add policies and tests.

17. Severity: Medium
    Location: Buyer phone uniqueness
    Explanation: Fixed on 2026-05-04. Buyer phone uniqueness is now tenant-scoped by `(user_id, phone)` and the old global `phone` unique index is removed on MySQL.
    Suggested fix: Keep this covered in future migration/tests; do not reintroduce `unique:buyers,phone`.

18. Severity: Medium
    Location: Store/product forms
    Explanation: Frontend DTOs were recently aligned; future drift likely.
    Suggested fix: generate or document API DTOs.

19. Severity: Medium
    Location: Product media upload deployment settings
    Explanation: Product photo/video upload now accepts common image/video MIME types and the local PM2/PHP runtime was raised to 50MB uploads, but this limit is partly server configuration outside tracked application code.
    Why it matters: A future server rebuild or proxy change can silently restore low `upload_max_filesize`, `post_max_size`, or request-body limits and break video upload again.
    Suggested fix: Move upload-size limits into repeatable infrastructure/deployment config and add an upload smoke test in CI/deploy checks.
    Files likely involved: `MediaController.php`, PHP/PM2/FPM/proxy deployment config.

19. Severity: Medium
    Location: Telegram webhook
    Explanation: Webhook verification strategy uncertain.
    Suggested fix: add per-bot secret path/header validation.

20. Severity: Medium
    Location: Admin plan builder UI
    Explanation: Backend supports dynamic rules, but UI still needs full feature matrix polish.
    Suggested fix: build create/edit/archive flows with invoice preview.

21. Severity: Medium
    Location: Observability
    Explanation: Request IDs, audit events, failed-job alerts are not fully present.
    Suggested fix: add structured logging and monitoring hooks.

22. Severity: Medium
    Location: API request metering
    Explanation: Metering in middleware can add write load.
    Suggested fix: buffer in Redis and roll up asynchronously.

23. Severity: Medium
    Location: Theme settings JSON
    Explanation: Store theme settings are arbitrary JSON.
    Suggested fix: validate schema.

24. Severity: Medium
    Location: Public product URL
    Explanation: Product detail uses global id.
    Suggested fix: add slug/store scoped product URLs.

25. Severity: Medium
    Location: Old SQL schema script
    Explanation: Legacy `scripts/001-schema.sql` may not match Laravel migrations.
    Suggested fix: mark as legacy or regenerate from current migrations.

26. Severity: Medium
    Location: Dashboard UI shell/pages/components
    Explanation: Dashboard pages use inconsistent header layouts, card radii, dense `font-black` styling, oversized glass/shadow effects, and page-local patterns rather than shared operational components.
    Why it matters: The dashboard feels less like a coherent enterprise SaaS product, and future fixes duplicate UI logic across pages.
    Suggested fix: Introduce shared dashboard shell/section/metric patterns and apply them incrementally to high-traffic dashboard surfaces.
    Files likely involved: `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `components/dashboard/sidebar.tsx`, `components/dashboard/shell-topbar.tsx`, `components/dashboard/stats-cards.tsx`, table components.

27. Severity: Medium
    Location: Dashboard table components
    Explanation: Several tables still use browser `confirm()` and inconsistent empty/error states.
    Why it matters: Browser confirms are hard to style, weak for enterprise UX, and inconsistent with the app design system.
    Suggested fix: Replace with shared `ConfirmDialog`/alert-dialog pattern and reusable empty/error table states.
    Files likely involved: `products-table.tsx`, `orders-table.tsx`, `stores-table.tsx`, `users-table.tsx`, `employees-table.tsx`.

28. Severity: Medium
    Location: `components/dashboard/stores-table.tsx`
    Explanation: Store list table UX, weak filters/sorting, weak store-limit visibility, and browser confirm deletion were fixed. Remaining risk is that pre-create media upload can still fail for non-admin users because uploads do not yet have a real store id, and the store create/edit wizard still uses legacy heavy styling.
    Why it matters: Store owners manage revenue-critical storefronts here; confusing store context, weak destructive-action UX, and hidden subscription limits create support load and failed onboarding.
    Suggested fix: Move logo/cover upload until after store creation or use a draft-media flow, then refactor the create/edit wizard into shared form sections with clearer save/validation states.
    Files likely involved: `components/dashboard/stores-table.tsx`, `app/dashboard/stores/page.tsx`, `lib/data-context.tsx`, `MediaController.php`.

29. Severity: Medium
    Location: `app/store/[slug]/page.tsx`, `components/store/storefront-client.tsx`, `components/store/cart-drawer.tsx`
    Explanation: Public storefront main page now uses a `DESIGN.md`-aligned light profile-style layout with centered `logoUrl`, `coverUrl`, limited default products/categories, dedicated products/categories/category routes, stable category filtering, and injected cart store data. Remaining risk is that checkout/client totals must never be treated as authoritative.
    Why it matters: Storefront is the revenue surface. Confusing default discovery, duplicate fetches, and weak mobile CTAs reduce conversion and slow customer experience.
    Suggested fix: Add product slug URLs, post-order confirmation, storefront cache invalidation tags, and checkout tests proving backend recalculates totals.
    Files likely involved: `app/store/[slug]/page.tsx`, `components/store/storefront-client.tsx`, `components/store/cart-drawer.tsx`, `PublicController.php`.

## Low

30. Severity: Low
    Location: Root `SKILL.md`
    Explanation: Placeholder skill file is not useful.
    Suggested fix: replace with real project instructions or remove.

31. Severity: Low
    Location: Locale labels
    Explanation: UI labels are translated, owner content is not. Future agents may confuse the two.
    Suggested fix: keep this rule visible in `.ai/AGENT_RULES.md`.

32. Severity: Low
    Location: Docs
    Explanation: `.ai` docs can go stale if not maintained.
    Suggested fix: enforce changelog/update rule after every task.

## Fixed / Mitigated

- Date: 2026-05-04
  Severity: High
  Location: `TenantMiddleware.php`, `lib/data-context.tsx`, `components/dashboard/shell-topbar.tsx`
  Explanation: Valid selected-store requests could fail with `UNAUTHENTICATED_TENANT` and the message “Authentication is required to select a store” because the global tenant middleware ran before route-level Sanctum auth populated `request->user()`. The frontend also read persisted selected store ids before authenticated store data was available.
  Fix: Tenant middleware now resolves and validates the Sanctum bearer token itself before checking `X-Store-ID`; frontend selected-store state is centralized in `DataContext`, persisted ids are validated against authenticated accessible stores, owners/employees auto-select a first active owned store, invalid ids are cleared, and the dashboard topbar uses one reusable `MainStoreSelector`.
  Files involved: `TenantMiddleware.php`, `SubscriptionService.php`, `lib/api-client.ts`, `lib/data-context.tsx`, `components/dashboard/main-store-selector.tsx`, `components/dashboard/shell-topbar.tsx`, `components/dashboard/header.tsx`, locale files.

- Date: 2026-05-09
  Severity: High
  Location: `components/dashboard/products-table.tsx`, `ProductController.php`
  Explanation: Dashboard product edit requests could fail backend validation or lose category mapping because edit payloads omitted `storeId` and `categoryId`; color option swatches collected in the UI were not persisted.
  Fix: Product edit payloads now include `storeId` and `categoryId`; `ProductController` persists option `swatches` to `swatches_json` on create/update and keeps canonical option fields only.
  Files involved: `components/dashboard/products-table.tsx`, `backend/app/Http/Controllers/Api/ProductController.php`.

- Date: 2026-05-09
  Severity: High
  Location: `PublicController@product`, `product-client.tsx`
  Explanation: Public product detail could render a globally addressed product under the wrong store slug, and selected variants were not reflected in client price/stock UX.
  Fix: Product detail passes `storeSlug` to `/public/product/{id}`; the backend returns 404 on slug mismatch; the product detail page matches selected options to variants for display price, quantity cap, and unavailable-state checks.
  Files involved: `backend/app/Http/Controllers/Api/PublicController.php`, `app/store/[slug]/product/[productId]/product-client.tsx`.

- Date: 2026-05-09
  Severity: High
  Location: `app/store/[slug]/product/[productId]/page.tsx`, `product-client.tsx`, subdomain `/product/{id}`
  Explanation: Subdomain product pages depended on client-side product fetching after the middleware rewrite, while metadata used a global product-id lookup without `storeSlug`. If hydration/client fetch failed, buyers could see only the loading shell, and metadata could be generated for the wrong store context.
  Fix: The product detail route now server-fetches the store and slug-scoped product, passes initial data to the existing client UI, renders translated not-found state before hydration, and uses `getAbsoluteStoreUrl(slug, /product/{id})` for subdomain-aware metadata.
  Files involved: `app/store/[slug]/product/[productId]/page.tsx`, `app/store/[slug]/product/[productId]/product-client.tsx`, locale files.

- Date: 2026-05-09
  Severity: High
  Location: `app/store/[slug]/product/[productId]/page.tsx`, `app/store/[slug]/product/[productId]/product-client.tsx`
  Explanation: The public product client still accepted `params` as a Promise and unwrapped it with React `use(params)`, leaving the subdomain product page vulnerable to client hydration/runtime failure. The client also assumed optional API fields such as `media`, `options`, `variants`, prices, delivery values, and swatches were always correctly shaped.
  Fix: The server route now awaits params once and passes a plain object to the client. The product client no longer imports/uses React `use` for route params and normalizes public product DTOs before render, including nullable arrays, numeric fields, option values, variants, images, and swatches.
  Files involved: `app/store/[slug]/product/[productId]/page.tsx`, `app/store/[slug]/product/[productId]/product-client.tsx`.

- Date: 2026-05-09
  Severity: High
  Location: live `storify-store` PM2 process, subdomain `/product/{id}`
  Explanation: The source had been repaired, but production was still serving the older standalone Next build. Live HTML still showed the old RSC payload with promise-shaped `params`, no `initialProduct`, no `initialLoadComplete`, and the previous client-only product shell, so buyers saw the skeleton instead of resolved product or error states.
  Fix: Rebuilt the Next app and restarted `storify-store` through `scripts/redeploy.sh`. Live smoke for `https://teststore.blackt.uk/product/13` now includes server-hydrated product data and renders product details; invalid product id renders the translated not-found state.
  Files involved: `app/store/[slug]/product/[productId]/page.tsx`, `app/store/[slug]/product/[productId]/product-client.tsx`, `scripts/redeploy.sh`, PM2 `storify-store`.

- Date: 2026-05-09
  Severity: Medium
  Location: `product-client.tsx`, `cart-drawer.tsx`, locale files
  Explanation: Modified storefront/cart surfaces had hardcoded multilingual strings outside locale files.
  Fix: Product detail and checkout/WhatsApp copy now use locale keys added to `locales/en|ar|ku/common.json`; dashboard loading labels were also moved to locale keys.
  Files involved: `app/store/[slug]/product/[productId]/product-client.tsx`, `components/store/cart-drawer.tsx`, `app/dashboard/layout.tsx`, locale files.

- Date: 2026-05-03
  Severity: Critical
  Location: `PublicController@submitOrder`, `OrderController@store`, `SubscriptionService`, `components/store/storefront-client.tsx`, `components/dashboard/users-table.tsx`
  Explanation: Public checkout could show “This store is not currently accepting more orders” because orders were still tied to `orders_per_month` subscription limits. Storefront category filtering also depended on display names, and admin user creation still exposed fixed-plan/order-limit pricing.
  Fix: Removed order-limit enforcement from public and authenticated order creation, made `orders_per_month` a non-blocking legacy check, added per-user custom limits/pricing via `user_limits`, added admin custom limit calculator flows, added stable category/product type id/slug filtering, added logo/profile/cover API aliases, and added storefront/admin translation keys.
  Files involved: `PublicController.php`, `OrderController.php`, `SubscriptionService.php`, `BillingController.php`, `AdminController.php`, `UserLimit.php`, `User.php`, `UserResource.php`, `StoreResource.php`, `ProductResource.php`, `StoreRequest.php`, `StoreController.php`, `routes/api.php`, `users-table.tsx`, `storefront-client.tsx`, `cart-drawer.tsx`, locale files, migration `2026_05_03_120000_create_user_limits_table.php`.

- Date: 2026-05-03
  Severity: Medium
  Location: `app/store/[slug]/page.tsx`, `components/store/storefront-client.tsx`, `components/store/cart-drawer.tsx`, `.ai/*`
  Explanation: Storefront main page needed conversion-focused product discovery and performance cleanup.
  Fix: Passed API sections to the client, redesigned the main storefront with image hero, trust signals, category tiles, featured/best-seller/trending/low-stock/new-arrival sections, search/category/price/sort controls, mobile sticky cart bar, responsive product cards, and avoided duplicate cart store fetch by passing store data from the page.
  Files involved: `app/store/[slug]/page.tsx`, `components/store/storefront-client.tsx`, `components/store/cart-drawer.tsx`, `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/API_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, `.ai/CHANGELOG_AI.md`.

- Date: 2026-05-04
  Severity: Medium
  Location: `app/store/[slug]/page.tsx`, `components/store/storefront-client.tsx`, `PublicController.php`, locale files
  Explanation: Storefront needed a simpler profile-style design using canonical `logoUrl` and `coverUrl`, with limited default content and reliable all-products/category filtering.
  Fix: Replaced the crowded storefront client with a profile layout, internal products/categories views, `logoUrl`/`coverUrl` branding, translated store open/closed and discovery labels, typed public page props, `coverUrl || logoUrl` metadata, and additive public store status fields.
  Files involved: `app/store/[slug]/page.tsx`, `components/store/storefront-client.tsx`, `backend/app/Http/Controllers/Api/PublicController.php`, `locales/en/common.json`, `locales/ar/common.json`, `locales/ku/common.json`.

- Date: 2026-05-04
  Severity: Medium
  Location: `app/store/[slug]/*`, `components/store/storefront-client.tsx`, locale files
  Explanation: Storefront profile logo alignment, route discoverability, and product-card conversion polish needed refinement.
  Fix: Centered the profile logo over the cover banner, added `/products`, `/categories`, and `/category/[id]` route pages using a shared storefront data helper, improved profile hierarchy/counts, added best-seller/new-arrival sections, added stock labels, improved product-card CTAs, refreshed loading skeletons, and added missing translated labels.
  Files involved: `app/store/[slug]/storefront-data.ts`, `app/store/[slug]/products/page.tsx`, `app/store/[slug]/categories/page.tsx`, `app/store/[slug]/category/[id]/page.tsx`, `app/store/[slug]/page.tsx`, `app/store/[slug]/loading.tsx`, `components/store/storefront-client.tsx`, `locales/en/common.json`, `locales/ar/common.json`, `locales/ku/common.json`.

- Date: 2026-05-04
  Severity: Medium
  Location: `DESIGN.md`, `components/store/storefront-client.tsx`, `app/store/[slug]/loading.tsx`
  Explanation: Storefront profile routes still used the older light card system after the Shopify-inspired `DESIGN.md` was added.
  Fix: Applied the `DESIGN.md` dark storefront system to the public profile, category, products, product cards, quick-view modal, sticky header/footer, mobile cart bar, and loading skeleton; kept the existing dedicated routes and shared filtering logic.
  Files involved: `DESIGN.md`, `components/store/storefront-client.tsx`, `app/store/[slug]/loading.tsx`, `.ai/AGENT_RULES.md`, `.ai/FILE_INDEX.md`.

- Date: 2026-05-04
  Severity: Medium
  Location: `DESIGN.md`, `components/store/storefront-client.tsx`, `app/store/[slug]/loading.tsx`, `app/store/[slug]/product/[productId]/product-client.tsx`
  Explanation: The storefront design system was applied as dark mode, but the requested production storefront direction is light-first across public store pages.
  Fix: Added a light-first implementation override to `DESIGN.md`, converted the profile/products/categories/category storefront client and loading skeleton to light Shopify-inspired surfaces, and aligned the product detail page primary palette/background with the light storefront.
  Files involved: `DESIGN.md`, `components/store/storefront-client.tsx`, `app/store/[slug]/loading.tsx`, `app/store/[slug]/product/[productId]/product-client.tsx`, `.ai/*`.

- Date: 2026-05-04
  Severity: Medium
  Location: `app/store/[slug]/product/[productId]/product-client.tsx`
  Explanation: Product detail still used the older heavy marketplace styling and several hardcoded visible labels after the main storefront was converted to the light profile system.
  Fix: Restyled product detail with the same light storefront surfaces, lighter typography, pill controls, polished gallery/options/trust/related-product sections, translated product-detail labels, and no dead footer links.
  Files involved: `app/store/[slug]/product/[productId]/product-client.tsx`, `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, `.ai/CHANGELOG_AI.md`.

- Date: 2026-05-04
  Severity: High
  Location: `buyers` DB indexes, `PublicController@submitOrder`, `BuyerController@store`
  Explanation: Public checkout could fail with `SQLSTATE[23000] Duplicate entry ... buyers_phone_unique` when a phone number already existed for another store owner because the database still enforced global buyer phone uniqueness.
  Fix: Updated the fresh baseline buyers schema and added migration `2026_05_04_001000_scope_buyer_phone_unique_per_owner.php` to drop the global phone unique index and add `buyers_user_id_phone_unique` on `(user_id, phone)`. Updated `BuyerController@store` to set owner `user_id` and validate phone uniqueness within that owner only.
  Files involved: `backend/database/migrations/2026_04_28_000000_create_core_saas_tables.php`, `backend/database/migrations/2026_05_04_001000_scope_buyer_phone_unique_per_owner.php`, `backend/app/Http/Controllers/Api/BuyerController.php`.

- Date: 2026-05-03
  Severity: Medium
  Location: `components/dashboard/stores-table.tsx`, `.ai/*`
  Explanation: Stores module needed documentation-first audit and a safer enterprise list experience for owners/admins.
  Fix: Documented Stores flow/API/DB risks, replaced table-only Stores UI with responsive store cards, added search/status filter/sort, visible plan capacity and store-limit upgrade prompt, clear enter-store/product/order/settings actions, proper alert-dialog delete confirmation, and stronger loading/empty states.
  Files involved: `components/dashboard/stores-table.tsx`, `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/API_MAP.md`, `.ai/DATABASE_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, `.ai/CHANGELOG_AI.md`.

- Date: 2026-05-03
  Severity: Medium
  Location: `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `app/dashboard/products/page.tsx`, `app/dashboard/orders/page.tsx`, `app/dashboard/stores/page.tsx`, `app/dashboard/product-types/page.tsx`, `app/dashboard/users/page.tsx`, `app/dashboard/buyers/page.tsx`, `app/dashboard/employees/page.tsx`, `components/dashboard/page-header.tsx`, `components/dashboard/sidebar.tsx`, `components/dashboard/shell-topbar.tsx`, `components/dashboard/stats-cards.tsx`, `components/dashboard/recent-activity.tsx`, `components/dashboard/header.tsx`, `app/globals.css`
  Explanation: Dashboard shell and page surfaces had inconsistent hierarchy, heavy decorative styling, employee overview showed owner-only/order-oriented affordances, product section page lacked local search, and the legacy header still used full-page reload navigation.
  Fix: Added a shared dashboard page header, refined shell spacing/background, improved sidebar active states and workspace identity, added topbar data sync/error state, redesigned dashboard overview focus panels, made employee overview catalog-only, cleaned metric/activity cards, added product-section local search/empty state, and replaced legacy internal header reloads with router navigation.
  Files involved: listed above.

- Date: 2026-05-03
  Severity: Medium
  Location: `components/dashboard/shell-topbar.tsx`, `components/dashboard/products-table.tsx`
  Explanation: Dashboard topbar search was visually present but not functional, internal notification/settings actions forced full page reloads, employee accounts could see account actions outside their allowed catalog scope, and product form render helpers called `useData()` from nested JSX paths.
  Fix: Added role-aware global dashboard search for products/categories/orders/stores, replaced full reload navigation with `router.push`, hid account settings from employees, suppressed employee order notifications, and moved product type/category data access to the top-level data context destructure.
  Files involved: `components/dashboard/shell-topbar.tsx`, `components/dashboard/products-table.tsx`.

- Date: 2026-05-03
  Severity: High
  Location: `app/dashboard/layout.tsx`, `components/dashboard/sidebar.tsx`, `lib/data-context.tsx`, catalog/order/buyer/store controllers
  Explanation: Employees could still reach or receive non-catalog dashboard/API data, and dashboard data loading was not path-aware after skipped public/storefront loads.
  Fix: Employees are now redirected to products/product-types only, sidebar only shows those routes, dashboard init returns catalog-only employee payloads, order/buyer/store management APIs deny employees, product/category APIs allow employee create/update while blocking destructive or integration actions, and data context reloads when entering dashboard routes.
  Files involved: `app/dashboard/layout.tsx`, `components/dashboard/sidebar.tsx`, `lib/data-context.tsx`, `ProductController.php`, `CategoryController.php`, `ProductTypeController.php`, `OrderController.php`, `BuyerController.php`, `StoreController.php`, `DashboardController.php`.

- Date: 2026-05-03
  Severity: High
  Location: `components/dashboard/users-table.tsx`, `AdminController@storeUser`, `app/dashboard/employees/page.tsx`, `components/dashboard/sidebar.tsx`
  Explanation: Platform admin user creation did not support assigning a subscription with dynamic price calculation, while employee management was not clearly restricted to store owners.
  Fix: Admin Users now uses custom per-user limits, simulates pricing through `/billing/calculate`, submits limits/pricing when creating or editing a store owner, and backend stores those settings in `user_limits`. Employees page/sidebar are store-owner only.
  Files involved: `components/dashboard/users-table.tsx`, `backend/app/Http/Controllers/Api/AdminController.php`, `app/dashboard/employees/page.tsx`, `components/dashboard/sidebar.tsx`, `lib/data-context.tsx`.

- Date: 2026-05-03
  Severity: High
  Location: `lib/data-context.tsx`, `app/dashboard/error.tsx`, `app/dashboard/loading.tsx`
  Explanation: Dashboard bootstrap could leave stale protected data or noisy failed fetch state after logout/no-token states, employee table state was not populated by the unified load, and dashboard routes lacked dedicated loading/error fallbacks.
  Fix: Data context now waits for auth bootstrap, clears dashboard data when no authenticated token exists, avoids no-token protected dashboard calls, loads employee rows for owner/admin dashboards, keeps verbose logs behind `NEXT_PUBLIC_DEBUG=true`, and adds dashboard route-level loading/error UI.
  Files involved: `lib/data-context.tsx`, `app/dashboard/error.tsx`, `app/dashboard/loading.tsx`.

- Date: 2026-05-03
  Severity: Critical
  Location: `backend/routes/api.php`, `ProfileController`, `AdminController`, `EmployeeController`, `app/dashboard/settings/page.tsx`
  Explanation: Password changes and account suspension/inactivation could leave existing Sanctum tokens valid until expiry.
  Fix: Login/refresh now reject inactive accounts. Self password changes revoke all user tokens and settings logs out after success. Admin password changes/suspensions revoke target-user tokens. Owner-managed employee password changes or inactive status revoke employee tokens.
  Files involved: `backend/routes/api.php`, `backend/app/Http/Controllers/Api/ProfileController.php`, `backend/app/Http/Controllers/Api/AdminController.php`, `backend/app/Http/Controllers/Api/EmployeeController.php`, `app/dashboard/settings/page.tsx`.

- Date: 2026-05-03
  Severity: High
  Location: `backend/routes/api.php`, `lib/auth-context.tsx`
  Explanation: Logout was local-only, leaving backend Sanctum access/refresh tokens valid until expiry.
  Fix: Added `/auth/logout` and `/auth/logout-all`; frontend logout now calls backend best-effort and clears selected store state.
  Files involved: `backend/routes/api.php`, `lib/auth-context.tsx`.

- Date: 2026-05-03
  Severity: High
  Location: `app/api/health/route.ts`, `app/api/cron/cleanup/route.ts`, `app/api/cron/worker/route.ts`
  Explanation: Operational route files were missing, causing health/cron URLs to 404 or disappear from the Next route manifest.
  Fix: Restored production-safe route handlers with secret-free health output and `CRON_SECRET` protection for maintenance/worker commands.
  Files involved: `app/api/health/route.ts`, `app/api/cron/cleanup/route.ts`, `app/api/cron/worker/route.ts`.

- Date: 2026-05-03
  Severity: Medium
  Location: `BillingController@checkoutSession`, `app/dashboard/billing/page.tsx`
  Explanation: Billing checkout returned a hard provider-not-configured placeholder while the UI used a local timeout and WhatsApp fallback.
  Fix: Checkout now returns provider redirect data when configured or a manual approval handoff; billing UI calls the backend handoff API.
  Files involved: `backend/app/Http/Controllers/Api/BillingController.php`, `app/dashboard/billing/page.tsx`.

- Date: 2026-05-02
  Severity: High
  Location: `app/dashboard/product-types/page.tsx`, `DashboardController@init`, `ProductTypeController`, `CategoryController`, `ProductTypeResource`, `CategoryResource`
  Explanation: `/dashboard/product-types` could render unreliably after dashboard data loaded because the page synced local state from an unstable stores array/effect dependency. Catalog API/bootstrap scoping also treated employees as direct owners and hid or mishandled global product type/category rows. Product type/category resource routes exposed `show` routes without controller methods.
  Fix: Memoized scoped stores and filtered groups in the page, defaulted new non-admin groups to owned stores, blocked non-admin global-row mutations in the UI, loaded owner/global catalog rows explicitly in dashboard init, added `show` methods, normalized owner/employee tenant checks, and returned nullable `storeId`/`productTypeId` values as `null`. No translated owner-input fields were added.
  Files involved: `app/dashboard/product-types/page.tsx`, `backend/app/Http/Controllers/Api/DashboardController.php`, `backend/app/Http/Controllers/Api/ProductTypeController.php`, `backend/app/Http/Controllers/Api/CategoryController.php`, `backend/app/Http/Resources/ProductTypeResource.php`, `backend/app/Http/Resources/CategoryResource.php`.

- Date: 2026-05-02
  Severity: High
  Location: `lib/api-client.ts`, `lib/data-context.tsx`
  Explanation: Dashboard data could fail with `UNAUTHENTICATED_TENANT` because `X-Store-ID` was sent before auth bootstrap completed or when no token existed.
  Fix: `X-Store-ID` is now only sent with an auth token. Safe GET recovery handles both `TENANT_ACCESS_DENIED` and `UNAUTHENTICATED_TENANT`, and `DataProvider` waits for auth bootstrap before loading dashboard data.
  Files involved: `lib/api-client.ts`, `lib/data-context.tsx`.

- Date: 2026-05-02
  Severity: High
  Location: `lib/api-client.ts`, `lib/auth-context.tsx`
  Explanation: Parallel dashboard section requests could all receive `401` and call `/auth/refresh` at the same time. Since refresh tokens rotate, one request could invalidate the token while another request still used the old refresh token, causing `clearSession()` and an unexpected logout.
  Fix: Added single-flight token refresh in `apiClient` and delayed auth bootstrap completion until silent refresh finishes.
  Files involved: `lib/api-client.ts`, `lib/auth-context.tsx`.

- Date: 2026-05-02
  Severity: High
  Location: `lib/api-client.ts`, `lib/auth-context.tsx`
  Explanation: Dashboard sections could appear missing or inaccessible after login when the browser retained an old `storify_selected_store_id`; the API client sent a stale `X-Store-ID`, causing backend `TENANT_ACCESS_DENIED` responses.
  Fix: Login now clears stale selected-store state. Safe GET requests now clear stale selected-store state and retry once without `X-Store-ID` when the backend returns `TENANT_ACCESS_DENIED`.
  Files involved: `lib/api-client.ts`, `lib/auth-context.tsx`.

- Date: 2026-05-02
  Severity: Medium
  Location: `app/login/page.tsx`, `app/dashboard/layout.tsx`, `components/auth/protected-route.tsx`
  Explanation: The application used `/` as the login screen, while session expiry and user expectations referenced `/login`. Without a real `/login` route and consistent guards, users could land on an inconsistent route.
  Fix: Added a dedicated `/login` page that reuses the root login screen and updated protected/dashboard redirects to `/login`.
  Files involved: `app/login/page.tsx`, `app/dashboard/layout.tsx`, `components/auth/protected-route.tsx`.

- Date: 2026-05-02
  Severity: High
  Location: `middleware.ts`
  Explanation: With subdomains enabled, local/IP hosts such as `127.0.0.1:3001` rewrote `/dashboard` to `/store/127.0.0.1/dashboard`, returning a storefront 404.
  Fix: Added localhost/IP bypass plus app-route bypasses for `/dashboard`, `/login`, and `/register` while preserving subdomain storefront roots.
  Files involved: `middleware.ts`.

- Date: 2026-05-02
  Severity: High
  Location: `app/dashboard/page.tsx`, dashboard role pages, `lib/data-context.tsx`
  Explanation: Employee accounts inherited owner data from the backend, but frontend helpers filtered stores by the employee id, producing empty dashboards and dead quick actions. Stale selected-store headers could also break dashboard bootstrap.
  Fix: Added role-aware dashboard actions/stats, employee restricted states, data error display, employee-aware store helper, dashboard init without tenant header, stale selected-store cleanup, and corrected employee API paths.
  Files involved: dashboard pages/components, `lib/data-context.tsx`, `lib/api-client.ts`.

- Date: 2026-05-02
  Severity: High
  Location: `backend/app/Services/SubscriptionService.php`
  Explanation: `getActiveSubscription()` cached a full Eloquent model. A stale serialized cache value could return `__PHP_Incomplete_Class`, violating the `?Subscription` return type.
  Fix: Cache only `active_sub_id`, hydrate a fresh `Subscription` model with `plan.features`, and clear both old/new cache keys in `clearCache()`.
  Files involved: `SubscriptionService.php`.
## 2026-05-10

- Severity: High
  Location: Flutter Dashboard backend API readiness
  Explanation: The Flutter Dashboard audit found missing backend APIs for store status/settings, Telegram settings/test, notification polling, device tokens, buyer update/blacklist, media delete/replace, billing limits payloads, admin broadcast, and realtime channel authorization.
  Fix: Added the missing APIs, additive DB schema, `private-store.{id}` authorization through `Broadcast::channel('store.{id}')`, admin-gated Telegram webhook setup, and safe Telegram response/log redaction.
  Remaining risks: push delivery requires provider env and queue workers; Bunny remote cleanup requires queue workers; `/buyers/auth` remains intentionally unsupported and the storefront now stays guest-first; Telegram webhook secrets are enforced only when `TELEGRAM_WEBHOOK_SECRET` is configured.
  Files involved: backend API controllers, routes, models/resources, migrations, `routes/channels.php`, notification listener/service.

## 2026-05-11

- Severity: Medium
  Location: Flutter Dashboard API smoke verification
  Explanation: The Flutter Dashboard app now compiles and builds, but no real backend credentials or seeded test tenant were available in this task, so authenticated API smoke tests for login, dashboard init, stores, products, and orders were not executed.
  Fix: None in this pass; runtime behavior is wired to `/api/v1` through the normalized API client and should be smoke-tested with a safe test user.
  Remaining risks: Backend contract drift or data-shape edge cases may only surface during authenticated smoke testing.
  Files involved: `lib/core/api/*`, `lib/core/auth/*`, `lib/features/*`.

- Severity: Medium
  Location: Flutter Dashboard Web token storage
  Explanation: `flutter_secure_storage` provides safer platform storage on mobile/desktop, but browser storage still has residual risk on shared or compromised browsers.
  Fix: The login screen includes a localized warning and the app avoids logging tokens or secrets.
  Remaining risks: Production web deployments should pair this with HTTPS, secure headers, short token TTLs, and backend revocation.
  Files involved: `lib/core/auth/secure_token_store.dart`, `lib/features/auth/login_page.dart`.

- Severity: High
  Location: Telegram webhook runtime configuration
  Explanation: `.ai2` documents that Telegram webhook secret validation is enforced only when `TELEGRAM_WEBHOOK_SECRET` is configured; missing secret is accepted for compatibility and logs a warning.
  Why it matters: Public webhook exposure is safer only after the secret is configured and webhook setup is rerun.
  Suggested fix: Set `TELEGRAM_WEBHOOK_SECRET` in every public environment and call the admin setup webhook.

- Severity: Medium
  Location: Queued push delivery and Bunny cleanup
  Explanation: `.ai2` documents that device-token push delivery and Bunny remote media cleanup are queued runtime work.
  Why it matters: Without queue workers, API writes remain consistent but push delivery and CDN cleanup will lag.
  Suggested fix: Run queue workers for the `notifications` and `media` queues and monitor failed jobs.

- Severity: Low
  Location: Unsupported buyer auth
  Explanation: `.ai2` documents that `/buyers/auth` is intentionally unsupported and the storefront remains guest-first.
  Why it matters: Future customer-account requirements need a new explicit auth design instead of reintroducing an undefined endpoint.
  Suggested fix: Keep checkout guest-first unless product requirements define buyer accounts.
