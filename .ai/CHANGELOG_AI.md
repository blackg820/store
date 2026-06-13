# AI Changelog

## 2026-06-13

Task:
Fix Nuxt storefront translation/i18n support after the storefront styling and port fix.

Changes:

- Switched Nuxt i18n to `no_prefix` routing so storefront hosts keep `/`, `/products/{slug}`, and `/categories/{slug}` URLs.
- Added JavaScript-only storefront locale resolution with priority: explicit user selection, Laravel store default language, supported browser language, then English.
- Persisted user locale selection with `dokani_locale` and `dokani_locale_source`, and applied `<html lang>` plus RTL/LTR direction for English, Arabic, and Kurdish.
- Expanded `frontend-nuxt/locales/en.json`, `ar.json`, and `ku.json` with storefront, product, category, checkout, notification, loading, empty, and error keys.
- Replaced hardcoded storefront UI strings in Nuxt pages/components with translation keys while leaving merchant-entered store, product, category, and description content untouched.
- Removed the remaining Nuxt source TypeScript marker from `pages/store-not-found.vue`.

Checks:

- `cd frontend-nuxt && npm install`: passed with the existing Node 20 versus `rollup-plugin-visualizer` Node >=22 warning and existing audit warnings.
- `cd frontend-nuxt && npm run lint`: passed.
- `cd frontend-nuxt && npm run build`: passed.
- `cd frontend-nuxt && npm run dev`: running on port 3001.
- Locale JSON parse check: passed for English, Arabic, and Kurdish.
- Nuxt source `.ts/.tsx` find check excluding generated/dependency folders: empty.
- Live `https://teststore.blackt.uk/` smoke with locale cookies: English rendered `lang="en" dir="ltr"`, Arabic rendered `lang="ar" dir="rtl"`, and Kurdish rendered `lang="ku" dir="rtl"`.
- Live `/products` and `/categories` smoke: both returned `200` without locale prefixes.
- Live HTML scan: no `_next` references and no `/en`, `/ar`, or `/ku` route prefixes.

## 2026-06-13

Task:
Build the real Nuxt storefront UI shell and visual foundation after the JavaScript-only Nuxt transition.

Changes:

- Replaced the minimal placeholder storefront CSS with a production storefront CSS foundation loaded through `frontend-nuxt/assets/css/main.css`.
- Added responsive RTL/LTR-aware layout primitives, typography, cards, buttons, badges, product grids, category pills, loading/error/empty states, and safe media fallback styling.
- Added shared Nuxt components: `AppButton`, `AppCard`, `AppBadge`, `AppEmptyState`, `AppLoading`, `AppError`, `ProductCard`, `StoreHeader`, `StoreHero`, `LanguageSwitcher`, and `CartButton`.
- Added `useStorefrontData.js` to fetch existing Laravel `/api/v1/public/store/{slug}` data after host tenant resolution.
- Rebuilt storefront routes `/`, `/products`, `/products/{product-slug}`, `/categories`, and `/categories/{category-slug}` to use existing Laravel API responses.
- Improved safe image rendering for logo, cover, and product media by rendering designed fallbacks when URLs are missing or fail.
- Preserved host-based tenant routing and avoided Laravel API changes.
- Kept Nuxt JavaScript-only.

Checks:

- Nuxt source `.ts/.tsx` find check excluding `node_modules`, `.nuxt`, and `.output`: empty.
- `cd frontend-nuxt && npm run lint`: passed.
- `cd frontend-nuxt && npm run build`: passed.

Remaining risks:

- Product detail resolves from the public store payload by product `slug` or `id` because the existing public product endpoint is id-based.
- Cart remains a visual shell in Nuxt and still needs the full checkout/cart migration from the production Next storefront.

## 2026-06-13

Task:
Continue the Nuxt transition slice and produce the final feature text in `.ai`.

Changes:

- Converted `frontend-nuxt/` source from the initial TypeScript skeleton to JavaScript-only Nuxt source.
- Removed Nuxt source `.ts`/`.tsx` files and replaced them with `.js` stores, composables, plugin, config, and lint setup.
- Added Nuxt auth, tenant, dashboard, notification, dashboard/admin/storefront page scaffolds.
- Added host-first storefront routes for home, products, product detail, categories, and category detail.
- Added JavaScript API client behavior for Laravel base URLs, bearer auth, language headers, `X-Store-ID`, refresh retry, and tenant denial cleanup.
- Added Nuxt deployment and Nuxt-only target docs.
- Updated `.ai` feature, API, and file maps to record the JavaScript-only Nuxt direction.

Checks:

- `cd frontend-nuxt && npm install`: passed with a Node-version warning from `rollup-plugin-visualizer` requiring Node >=22 while current Node is 20.19.5.
- Nuxt source `.ts/.tsx` find check excluding `node_modules`, `.nuxt`, and `.output`: empty.
- `cd frontend-nuxt && npm run lint`: passed.
- `cd frontend-nuxt && npm run build`: passed.
- `cd backend && composer validate --no-ansi`: passed.
- `cd backend && php artisan route:list --path=api/v1 --no-ansi`: passed and showed 147 routes.
- `cd backend && php artisan migrate --pretend --no-ansi`: passed.
- Root `npx tsc --noEmit --pretty false`: passed.
- Root `npm run lint -- --max-warnings=0`: passed.
- Root `npm run build`: passed with the existing Next 16 middleware deprecation warning.

Remaining risks:

- Nuxt remains a migration scaffold, not production-facing.
- Auth cookies are migration tokens and should become HTTP-only cookies or a Laravel SSR session bridge before cutover.
- Dashboard/storefront pages still need endpoint-backed parity work before replacing Next.
- PHP feature tests were not run because PHP CLI has `PDO` and `pdo_mysql` but not `pdo_sqlite`, and no dedicated test database credentials were configured.

## 2026-05-10

Task:
Documentation-only Flutter Dashboard API audit and future build prompt

Reason:
User requested a senior SaaS/API/Flutter architecture audit and a complete prompt for a later Codex run to build a separate Flutter Dashboard app without building Flutter now, changing backend logic, or changing the current frontend/storefront.

Files created:

- `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`
- `.ai/FLUTTER_DASHBOARD_BUILD_PROMPT.md`

Files updated:

- `.ai/API_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/FILE_INDEX.md`
- `.ai/AGENT_RULES.md`
- `.ai/CHANGELOG_AI.md`

Audit coverage:

- Read `DESIGN.md`, root `SKILL.md`, and required `.ai` memory files.
- Re-checked that `Skills.sh` is still missing.
- Inspected Laravel routes, controllers, requests, resources, middleware, models, migrations, services, frontend API client, auth/data contexts, store selector, settings, notification, billing, and i18n files.
- Documented all Flutter-relevant APIs by feature with auth, role, request/response, tenant checks, readiness, and gaps.
- Generated a copyable future-build prompt with Flutter architecture, phases, UI/i18n/security rules, store selector rules, testing checks, and output format.

Main findings:

- Existing `/api/v1` APIs are enough for an initial Flutter auth, store selector, products, categories, orders, media upload, billing/admin, and partial Telegram dashboard.
- Store settings API/resource alignment is incomplete for status/open-closed, defaultLanguage, bio, telegramChannelId response, telegramAutoPost, and partial settings updates.
- Realtime notifications are incomplete: `OrderCreated` broadcasts to `private-store.{id}` but only `App.Models.User.{id}` is authorized in `routes/channels.php`.
- Mobile push/FCM endpoints do not exist; only web-push subscribe/unsubscribe exists.
- Current web references missing endpoints such as `POST /admin/broadcast`, `POST /buyers/auth`, and `/api/v1/docs`.
- Store owners must not set Telegram bot token; backend uses a platform-managed Telegram token.
- Orders have no SaaS order limits and this rule was reinforced in `.ai/AGENT_RULES.md`.

Checks run:

- `php artisan route:list --path=v1`: passed and showed 94 `/api/v1` routes.
- Documentation files were created/updated only. No Flutter app was built, no backend logic changed, no packages installed.

Remaining risks:

- Backend tests were not run because this was a documentation-only audit and no backend behavior changed.
- Future Flutter implementation should first resolve or explicitly defer the backend prerequisites listed in `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`.

## 2026-05-09

Task:
Fix product page stuck on skeleton loading

Root cause:

- The production PM2 process was still serving the older standalone Next build.
- Live HTML for `https://teststore.blackt.uk/product/13` still had the old RSC payload: promise-shaped `params`, no `initialProduct`, no `initialLoadComplete`, and the previous client-only loading shell.
- The live public APIs were healthy, so the stuck skeleton was deployment/runtime drift rather than a backend product lookup failure.

Loading state fix:

- Rebuilt the Next app and restarted the `storify-store` PM2 process through `scripts/redeploy.sh`.
- Confirmed the live page now serves the repaired product route payload with server-hydrated product data and no old `/api/stores/...` client fetch.

API/route/store resolution fix:

- No new route or API contract change was required in this pass.
- Middleware still rewrites `teststore.blackt.uk/product/13` to `/store/teststore/product/13`.
- Product data still loads through `/public/product/13?storeSlug=teststore`, and cross-store access returns `404`.

Null-safety and translation fixes:

- No additional source changes were required beyond the already repaired product route/client.
- Existing locale-backed loading, not-found, failed-load, back-to-store, add-to-cart, buy-now, unavailable, and option-selection labels were kept.

Files changed:

- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Checks run:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed before redeploy.
- `bash scripts/redeploy.sh`: passed and restarted `storify-store`.
- Live HTML smoke for `https://teststore.blackt.uk/product/13`: `200`, middleware rewrite present, product data present, `initialProduct` present, `initialLoadComplete` present, old promise params absent.
- Live Chromium smoke for `https://teststore.blackt.uk/product/13`: product title/store/add-to-cart rendered; loading text and global error absent.
- Live Chromium smoke for `https://teststore.blackt.uk/product/999999`: translated not-found state rendered; loading text and global error absent.
- Live API smoke: `/api/v1/public/product/13?storeSlug=wrongstore` returned `404`.
- Locale JSON parse validation: passed for `en`, `ar`, and `ku`.
- `php -l`: passed for inspected public controller/resource files.
- `npm run lint`: blocked because `eslint` is not installed.
- `php artisan test`: blocked by missing SQLite PDO for the Al-Waseet feature suite; 2 tests passed before the environment failure.

Remaining risks:

- Existing broad previous-agent changes remain in the worktree and were not blindly reverted.
- Browser smoke used Chromium DOM checks, not a full Playwright interaction test.
- CI should add a regression check that fails when a subdomain product page serves only skeleton/loading output.

Recommended next safe task:

- Add automated subdomain product detail smoke tests covering valid product, invalid product, cross-store product rejection, and no infinite skeleton state.

Task:
Fix public product page runtime crash

Root cause:

- The subdomain route `https://teststore.blackt.uk/product/13` rewrote correctly to `/store/teststore/product/13`, but the product detail client still received `params` as a Promise and unwrapped it with React `use(params)`.
- That left the public product page vulnerable to client hydration/runtime failure and matched the browser-level “This page couldn’t load” state reported on production.
- The client also assumed optional product DTO fields were always present and correctly typed, including `media`, `options`, `variants`, prices, delivery values, and swatches.

Route fix:

- Updated `app/store/[slug]/product/[productId]/page.tsx` to await route params on the server and pass plain `{ slug, productId }` to `ProductClient`.
- Kept the existing `middleware.ts` subdomain rewrite from `/product/{id}` to `/store/{slug}/product/{id}` unchanged.

API/tenant validation fix:

- No API contract change was required.
- The route continues to fetch `/public/product/{id}?storeSlug={slug}` so the backend rejects products outside the resolved store context.

UI/product detail and null-safety fixes:

- Removed client-side `use(params)` from `product-client.tsx`.
- Normalized server and fallback-fetched product DTOs before render.
- Added defensive handling for missing arrays, non-numeric numeric fields, missing images, absent option values, nullable variants, and non-string swatches.
- Kept existing translated loading, failed-load, not-found, add-to-cart, unavailable, and store-closed strings.

Files changed:

- `app/store/[slug]/product/[productId]/page.tsx`
- `app/store/[slug]/product/[productId]/product-client.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/API_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Checks run:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Locale JSON parse validation: passed for `en`, `ar`, and `ku`.
- Local Chromium smoke with `Host: teststore.blackt.uk`: `/product/13` returned rendered product HTML without the global Next error.
- Local invalid product smoke with `Host: teststore.blackt.uk`: `/product/999999` rendered translated not-found state.
- Local header smoke confirmed `x-middleware-rewrite: /store/teststore/product/13`.
- Live API smoke: `/api/v1/public/product/13?storeSlug=teststore` returned `200`; `storeSlug=wrongstore` returned `404`.
- `npm run lint`: blocked because `eslint` is not installed.
- `php -l`: passed for inspected public controller/resource files.
- `php artisan test`: blocked by missing SQLite PDO for the Al-Waseet feature suite; 2 tests passed before the environment failure.

Remaining risks:

- Existing broad previous-agent changes remain in the worktree and were not blindly reverted.
- Production must be restarted/redeployed to pick up these local code changes; live HTML observed during debugging still reflected the older client-only product shell.
- Browser-console e2e coverage is still missing because Playwright is not installed.

Recommended next safe task:

- Add focused subdomain product detail regression tests for valid product, invalid product, cross-store product rejection, and cart add with missing optional DTO fields.

Task:
Fix public product page route on store subdomains

Root cause:

- `https://teststore.blackt.uk/product/13` was correctly rewritten by `middleware.ts` to `/store/teststore/product/13`, but the product detail route rendered a client-driven loading shell until hydration finished.
- `generateMetadata` fetched `/public/product/{id}` without `storeSlug`, so metadata was not tenant-scoped and could describe a product outside the requested storefront context.

Fixes applied:

- Updated `app/store/[slug]/product/[productId]/page.tsx` to server-fetch `/public/store/{slug}` and `/public/product/{id}?storeSlug={slug}` before hydration.
- Passed initial store/product/products data into the existing `ProductClient` instead of duplicating product rendering logic.
- Kept the client-side slug-scoped fallback fetch for navigation/retry behavior.
- Rendered translated not-found state from server-provided data for invalid/missing products.
- Updated metadata to use the resolved store, product image, and subdomain URL from `getAbsoluteStoreUrl(slug, /product/{id})`.
- Added product-detail translation keys for loading, failed load, and wrong-store product states.
- Added a checkout-open guard to product detail add-to-cart/Buy Now based on public store status fields when available.

Files changed:

- `app/store/[slug]/product/[productId]/page.tsx`
- `app/store/[slug]/product/[productId]/product-client.tsx`
- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `.ai/FILE_INDEX.md`
- `.ai/API_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Checks run:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Locale JSON parse validation: passed for `en`, `ar`, and `ku`.
- `npm run lint`: blocked because `eslint` is not installed.
- `php -l`: passed for inspected public controller/resource files.
- `php artisan test`: blocked by missing SQLite PDO for the Al-Waseet feature suite; 2 tests passed before the environment failure.
- Local smoke with `Host: teststore.blackt.uk`: `/product/13` returned `200`, rewrote to `/store/teststore/product/13`, included product/store HTML, and emitted `og:url=https://teststore.blackt.uk/product/13`.
- Local smoke with `Host: teststore.blackt.uk`: `/product/999999` returned `200` with translated product-not-found state.
- Live API smoke: `/api/v1/public/product/13?storeSlug=teststore` returned `200`; `storeSlug=wrongstore` returned `404`.

Remaining risks:

- Existing broad previous-agent changes remain in the worktree and were not blindly reverted.
- Browser console testing was not run because Playwright is not installed.
- Production `https://teststore.blackt.uk/product/13` currently returns `200` and rewrites correctly, but live deployment must be restarted/redeployed to pick up these local code changes.

Recommended next safe task:

- Restore the backend test environment/CI dependency for SQLite PDO, then add focused public product route tests for valid product, missing product, and cross-store product rejection.

Task:
Recovery audit and repair for dashboard and product page

Mistakes found:

- Dashboard product edit payloads omitted backend-required `storeId` and did not send `categoryId`, causing validation/category mapping regressions.
- Product option color swatches were captured in the dashboard UI but dropped by `ProductController`.
- Public product detail could render a global product id under the wrong store slug.
- Product detail add-to-cart ignored selected variant price and stock state.
- Modified product detail/cart/dashboard loading copy included hardcoded user-facing strings instead of locale keys.

Fixes applied:

- Added `storeId` and `categoryId` to product edit payloads.
- Persisted product option `swatches` to `swatches_json` on create/update.
- Added optional `storeSlug` validation to `/public/product/{id}` and made the product page call it.
- Added variant option matching for product-detail display price, quantity cap, unavailable state, and cart price estimate.
- Moved recovered product detail, checkout WhatsApp, checkout placeholder, and dashboard loading strings into `locales/en|ar|ku/common.json`.

Files changed:

- `app/dashboard/layout.tsx`
- `components/dashboard/products-table.tsx`
- `app/store/[slug]/product/[productId]/product-client.tsx`
- `components/store/cart-drawer.tsx`
- `backend/app/Http/Controllers/Api/ProductController.php`
- `backend/app/Http/Controllers/Api/PublicController.php`
- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `.ai/FILE_INDEX.md`
- `.ai/API_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/AGENT_RULES.md`
- `.ai/CHANGELOG_AI.md`

Checks run:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Locale JSON parse validation: passed for `en`, `ar`, and `ku`.
- `php -l`: passed for touched PHP controllers.
- `php artisan test`: still blocked by missing SQLite PDO for the Al-Waseet feature suite; 2 tests passed before the environment failure.
- `npm run lint`: blocked because `eslint` is not installed.
- Smoke checks on port 3001 returned `200` for `/dashboard`, `/dashboard/products`, `/dashboard/orders`, `/dashboard/settings`, `/store/test`, `/store/test/products`, `/store/test/product/6`, and `/api/health`.
- `/api/v1/public/product/6?storeSlug=test` returned `200`; the same product with `storeSlug=wrong-slug` returned `404`.

Remaining risks:

- Existing broad previous-agent changes remain in the worktree and were not blindly reverted.
- Kurdish locale still has older missing keys outside this recovery scope.
- Order items still do not persist `variant_id`; checkout remains server-authoritative via selected options.
- Backend tests need SQLite PDO or a MySQL test profile.

Recommended next safe task:

- Restore the test environment and add focused product edit/product detail/checkout regression tests before any further UI work.

## 2026-05-04

Task:
Main store selector refactor and authentication error fix

Reason:
Valid selected-store dashboard requests were failing with “Authentication is required to select a store” because tenant selection was evaluated before route-level Sanctum auth populated the request user, and frontend selected-store state was read from localStorage before authenticated store ownership was known.

Files:

- `components/dashboard/main-store-selector.tsx`
- `components/dashboard/shell-topbar.tsx`
- `components/dashboard/header.tsx`
- `lib/data-context.tsx`
- `lib/api-client.ts`
- `backend/app/Http/Middleware/TenantMiddleware.php`
- `backend/app/Services/SubscriptionService.php`
- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `.ai/PROJECT_CONTEXT.md`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/API_MAP.md`
- `.ai/DATABASE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/AGENT_RULES.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Added one reusable dashboard `MainStoreSelector` with store logo/name/status, search, loading, no-store, invalid-store, and create-store states.
- Replaced duplicated topbar/header store dropdown logic with the main selector.
- Centralized selected-store state in `DataContext` with authenticated accessible-store validation, persisted-id cleanup, owner/employee first-active-store fallback, selected store exposure, and automatic selection of newly created stores.
- Cleared persisted selected store during API-client session cleanup.
- Fixed `TenantMiddleware` to resolve the Sanctum bearer token before validating `X-Store-ID`, because the middleware is global and can run before route auth.
- Added default custom-limit fallback for `api_requests` so incomplete legacy plan data does not block dashboard API calls.
- Added store-selector, store-creation, store-settings/profile, branding, and social/settings translation keys for English, Arabic, and Kurdish.

APIs:

- No new routes.
- Tenant header validation behavior documented: valid owned `X-Store-ID` proceeds, cross-owner store returns `TENANT_ACCESS_DENIED`, missing/invalid auth returns `UNAUTHENTICATED_TENANT`.

DB:

- No schema changes.

Checks:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Next reported the existing middleware-to-proxy deprecation warning.
- `npm run lint`: blocked because `eslint` is not installed.
- `php -l backend/app/Http/Middleware/TenantMiddleware.php`: passed.
- `php -l backend/app/Services/SubscriptionService.php`: passed.
- `php artisan test`: blocked by missing SQLite PDO driver; 2 tests passed before 7 Al-Waseet feature tests failed on `could not find driver`.
- Locale JSON parse check: passed.
- Dashboard route smoke `http://127.0.0.1:3001/dashboard`: `200`.
- Owned selected-store API smoke `GET /api/v1/products` with `X-Store-ID`: `HTTP 200 success=true`.
- Cross-owner selected-store API smoke: `HTTP 403 TENANT_ACCESS_DENIED`.
- PM2 `storify-backend` and `storify-store` restarted.

Notes:

- `components/dashboard/header.tsx` appears unused by the active dashboard layout; it now delegates to `MainStoreSelector` but should be removed later after confirming no external imports.
- Store social profile fields are not yet schema-backed beyond existing store description/contact/logo/cover settings.

## 2026-05-04

Task:
Fix Product Photo/Video Upload

Reason:
Product media uploads were failing for common files because runtime upload limits were too low, MIME validation was too narrow, legacy storage entitlement data could return `FEATURE_DISABLED`, and the product form did not reliably select a store or show backend validation messages.

Files:

- `components/dashboard/products-table.tsx`
- `backend/app/Http/Controllers/Api/MediaController.php`
- `backend/app/Models/Media.php`
- `backend/app/Services/SubscriptionService.php`
- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `/etc/php/8.4/cli/php.ini`
- `/etc/php/8.4/fpm/php.ini`
- `/etc/php/8.4/apache2/php.ini`
- `.ai/FILE_INDEX.md`
- `.ai/API_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Raised PHP upload runtime limits to `upload_max_filesize=50M` and `post_max_size=64M`.
- Expanded Laravel media validation to common product image/video formats including JPEG/PNG/WebP/GIF/HEIC/HEIF/MP4/WebM/MOV/AVI up to 50MB.
- Added product/store ownership validation for optional `productId` on media upload.
- Persisted real media metadata fields (`file_path`, `storage_provider`, `is_main`) and only marks Bunny as provider after a successful Bunny upload.
- Made product media upload choose an authorized default store, added a visible store selector in the product form when needed, and surfaced backend validation `message/errors` instead of a generic failed-upload toast.
- Added translated product media upload copy for English, Arabic, and Kurdish.
- Changed `SubscriptionService` so legacy plan records missing custom-limit features fall back to default per-user limits instead of disabling storage uploads.

Docs:

- Updated `.ai/FILE_INDEX.md`, `.ai/API_MAP.md`, `.ai/FEATURE_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, and `.ai/CHANGELOG_AI.md`.
- DB docs unchanged; no schema migration was added.

Checks:

- `php -l` on `MediaController.php`, `Media.php`, and `SubscriptionService.php`: passed.
- Locale JSON parse check for English, Arabic, and Kurdish: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Next reported the existing middleware-to-proxy deprecation warning.
- `npm run lint`: blocked because `eslint` is not installed.
- Backend direct upload smoke test `POST /api/v1/media`: `HTTP 200 success=true`.
- Next proxy upload smoke test `POST http://127.0.0.1:3001/api/v1/media`: `HTTP 200 success=true`.
- Dashboard products route smoke check `http://127.0.0.1:3001/dashboard/products`: `200`.
- PM2 `storify-backend` and `storify-store` restarted.

Notes:

- Keep deployment/proxy body-size limits aligned with the 50MB app validation.

## 2026-05-04

Task:
Product Detail Light Storefront UI Alignment

Reason:
User clarified that the product page also needed the same light Shopify-inspired storefront treatment.

Files:

- `app/store/[slug]/product/[productId]/product-client.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Restyled the product detail header, gallery, thumbnails, product info, options, quantity selector, trust cards, related products, footer, and mobile sticky CTA to match the light storefront system.
- Replaced heavy uppercase marketplace typography with lighter, cleaner storefront hierarchy.
- Added translated product-detail labels for visible product page copy and removed dead footer links.
- Preserved existing cart/order behavior.

Docs:

- Updated `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, and `.ai/CHANGELOG_AI.md`.
- API docs unchanged.
- DB docs unchanged.

Checks:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Next reported the existing middleware-to-proxy deprecation warning.
- `npm run lint`: blocked because `eslint` is not installed in the project.
- `git diff --check` on changed product/docs files: passed.
- PM2 `storify-store` restarted.
- Smoke check `/store/test/product/7`: returned `200`.

Notes:

- `Skills.sh` was not found.
- Product detail still fetches product and store data client-side; a future pass can move it toward shared server data helpers.

## 2026-05-04

Task:
Storefront Light-First Design Correction

Reason:
User clarified that the Shopify-inspired design should apply across public storefront pages, but not as dark mode.

Files:

- `DESIGN.md`
- `components/store/storefront-client.tsx`
- `app/store/[slug]/loading.tsx`
- `app/store/[slug]/product/[productId]/product-client.tsx`
- `.ai/PROJECT_CONTEXT.md`
- `.ai/SKILLS.md`
- `.ai/AGENT_RULES.md`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Added a light-first implementation override to `DESIGN.md`.
- Converted profile, products, categories, category route views, product cards, filters, quick-view modal, footer, mobile cart bar, and loading skeleton from dark styling to light Shopify-inspired storefront styling.
- Aligned the product detail page default palette and page background with the light storefront system.
- Preserved existing routes and shared product/category filtering logic.

Docs:

- Updated `.ai` memory files to record that public storefront UI is light-first unless dark mode is explicitly requested.
- API docs unchanged because no API contract changed.
- DB docs unchanged because no schema changed.

Checks:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Next reported the existing middleware-to-proxy deprecation warning.
- `npm run lint`: blocked because `eslint` is not installed in the project.
- `git diff --check` on changed storefront/docs files: passed after whitespace cleanup.
- PM2 `storify-store` restarted.
- Smoke checks returned `200` for `/store/test`, `/store/test/products`, `/store/test/categories`, and `/store/test/product/7`.

Notes:

- `Skills.sh` was not found.
- Existing product-detail hardcoded labels remain a follow-up translation cleanup item.

## 2026-05-04

Task:
Storefront DESIGN.md UI/UX Alignment

Reason:
User added `DESIGN.md` as the primary Shopify-inspired UI reference and requested continued storefront improvement without duplicating product/category filtering logic.

Files:

- `DESIGN.md` (read-only reference)
- `components/store/storefront-client.tsx`
- `app/store/[slug]/loading.tsx`
- `.ai/PROJECT_CONTEXT.md`
- `.ai/SKILLS.md`
- `.ai/AGENT_RULES.md`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Applied the `DESIGN.md` dark storefront system to the profile header, cover/banner, centered `logoUrl` avatar, navigation, category chips/cards, product cards, product filters, quick-view modal, footer, and mobile cart bar.
- Kept the existing dedicated routes `/store/[slug]/products`, `/store/[slug]/categories`, and `/store/[slug]/category/[id]` and preserved the shared `StorefrontClient` filtering logic.
- Updated the storefront loading skeleton to match the dark profile storefront.
- Added the rule that future UI/UX work must read `DESIGN.md` first.

Docs:

- Updated `.ai/PROJECT_CONTEXT.md`, `.ai/SKILLS.md`, `.ai/AGENT_RULES.md`, `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, and `.ai/CHANGELOG_AI.md`.
- API docs unchanged because no API contract changed.
- DB docs unchanged because no DB schema changed.

Checks:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Next reported the existing middleware-to-proxy deprecation warning.
- `npm run lint`: blocked because `eslint` is not installed in the project.
- `git diff --check` on changed storefront/docs files: passed.
- PM2 `storify-store` restarted.
- Smoke checks: `/store/test`, `/store/test/products`, and `/store/test/categories` returned `200`.

Notes:

- `Skills.sh` was not found.
- No user-facing hardcoded labels were added.

## 2026-05-04

Task:
Fix Tenant-Scoped Buyer Phone Uniqueness

Reason:
Public checkout failed with `SQLSTATE[23000] Duplicate entry ... buyers_phone_unique` because buyer phone numbers were globally unique even though buyers are tenant-owner scoped.

Files:

- `backend/database/migrations/2026_04_28_000000_create_core_saas_tables.php`
- `backend/database/migrations/2026_05_04_001000_scope_buyer_phone_unique_per_owner.php`
- `backend/app/Http/Controllers/Api/BuyerController.php`
- `.ai/FILE_INDEX.md`
- `.ai/API_MAP.md`
- `.ai/DATABASE_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Changed fresh buyers schema from global `phone` unique to unique `(user_id, phone)`.
- Added a MySQL repair migration that drops old global buyer phone unique indexes and adds `buyers_user_id_phone_unique`.
- Updated buyer creation validation to scope phone uniqueness to the tenant owner.
- Updated buyer creation to explicitly set `user_id` to the tenant owner/admin-selected owner.

Docs:

- Updated `.ai/FILE_INDEX.md`, `.ai/API_MAP.md`, `.ai/DATABASE_MAP.md`, `.ai/FEATURE_MAP.md`, `.ai/BUGS_AND_RISKS.md`, and `.ai/CHANGELOG_AI.md`.

Checks:

- PHP syntax checks for changed backend files: passed.
- `php artisan migrate --force`: applied `2026_05_04_001000_scope_buyer_phone_unique_per_owner`.
- DB index smoke check: `buyers` now has `buyers_user_id_phone_unique` on `user_id,phone` and no global `buyers_phone_unique`.
- Rolled-back DB smoke check: same phone can be inserted for two different users.
- `php artisan test`: still blocked by missing SQLite PDO for Al-Waseet feature tests; 2 tests passed before the known driver failure group.
- PM2 `storify-backend` restarted.
- Backend smoke check `/api/v1/public/settings`: `200`.

Notes:

- `Skills.sh` was not found.
- Public checkout already used `(user_id, phone)` lookup; the failing piece was the live database/global unique index.

## 2026-05-04

Task:
Storefront Conversion UX Upgrade And Profile Logo Alignment

Reason:
User requested a more professional conversion-focused storefront, fixed profile logo alignment, stronger product/category experiences, dedicated listing routes where possible, and complete translation coverage for visible storefront labels.

Files:

- `app/store/[slug]/storefront-data.ts`
- `app/store/[slug]/page.tsx`
- `app/store/[slug]/products/page.tsx`
- `app/store/[slug]/categories/page.tsx`
- `app/store/[slug]/category/[id]/page.tsx`
- `app/store/[slug]/loading.tsx`
- `components/store/storefront-client.tsx`
- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/API_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Centered the store profile logo over the cover banner on desktop and mobile, using `logoUrl` with a fallback store icon.
- Added shared storefront data helper to keep public store route fetch behavior consistent.
- Added dedicated storefront routes: `/store/[slug]/products`, `/store/[slug]/categories`, and `/store/[slug]/category/[id]`.
- Made the storefront client route-aware with `initialView` and `initialCategoryId` props.
- Improved profile hierarchy with centered identity, status badge, product/category count strip, and stronger primary CTAs.
- Improved product cards with clearer image layout, discount badge, stock/low-stock/out-of-stock labels, full-width add-to-cart CTA, and details shortcut.
- Added best-seller section when API data exists and new-arrival fallback section.
- Improved category cards and show-all navigation to use real routes.
- Refreshed storefront loading skeleton to match the profile layout.
- Added missing storefront translation keys across English, Arabic, and Kurdish.

Docs:

- Updated `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/API_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, and `.ai/CHANGELOG_AI.md`.

Checks:

- Locale JSON validation: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed and includes the new storefront routes.
- `npm run lint`: blocked because `eslint` is not installed.
- PM2 `storify-store` restarted.
- Local smoke checks passed: `/store/test`, `/store/test/products`, and `/store/test/categories` returned `200`.

Notes:

- `Skills.sh` was not found.
- No backend/API behavior changed in this task.
- `Buy now` translation keys were added, but no separate buy-now action was wired because the current cart drawer does not expose a safe direct-checkout trigger. Add it after cart checkout can be opened programmatically.

## 2026-05-04

Task:
Store Main Page Profile Redesign With Canonical Branding Fields

Reason:
User requested a clean profile-style customer storefront that uses `logoUrl` and `coverUrl`, limits default page clutter, supports show-all products/categories behavior, fixes filtering, and keeps all visible labels translated.

Files:

- `app/store/[slug]/page.tsx`
- `components/store/storefront-client.tsx`
- `backend/app/Http/Controllers/Api/PublicController.php`
- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/API_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Rebuilt the main storefront client into a profile-style page with `coverUrl` banner, circular `logoUrl` avatar, store name/description/status, limited category chips, limited featured/recent products, and cleaner mobile layout.
- Added internal all-products and all-categories views because no dedicated `/store/[slug]/products` route exists.
- Preserved quick add, product option modal, guest cart drawer, WhatsApp contact, and mobile sticky cart behavior.
- Fixed product discovery flow: default limited products, all products, category filtering by stable keys, search within category, and clear filters.
- Removed frontend use of old branding names and kept public page props typed instead of `any`.
- Added additive public API store fields: `status`, `isOpen`, and `checkoutEnabled`.
- Added English, Arabic, and Kurdish storefront translation keys for profile, category, product, search, empty, and status labels.

Docs:

- Updated `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/API_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, and `.ai/CHANGELOG_AI.md`.

Checks:

- Locale JSON validation: passed.
- `php -l backend/app/Http/Controllers/Api/PublicController.php`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `npm run lint`: blocked because `eslint` is not installed.
- `php artisan test`: blocked by missing SQLite PDO for Al-Waseet feature tests; 2 tests passed before the known driver failure group.
- PM2 `storify-store` and `storify-backend` restarted.
- Local smoke check `http://127.0.0.1:3001/store/test`: `200 OK`.
- Public store API smoke check confirmed `status`, `isOpen`, and `checkoutEnabled` are present.

Notes:

- `Skills.sh` was not found.
- Remaining storefront work: optional dedicated listing routes, product slug URLs, review/social-proof data, checkout confirmation polish, and storefront cache invalidation.

## 2026-05-03

Task:
Order Limit Removal, Storefront Filtering, Branding Aliases, Custom User Limits

Reason:
User made order limits a critical business rule violation and requested no fixed-plan dependency, stable product/category filtering, storefront translation coverage, and custom per-user SaaS limit pricing.

Files:

- `backend/app/Http/Controllers/Api/PublicController.php`
- `backend/app/Http/Controllers/Api/OrderController.php`
- `backend/app/Services/SubscriptionService.php`
- `backend/app/Http/Controllers/Api/BillingController.php`
- `backend/app/Http/Controllers/Api/AdminController.php`
- `backend/app/Http/Controllers/Api/StoreController.php`
- `backend/app/Http/Requests/StoreRequest.php`
- `backend/app/Http/Resources/ProductResource.php`
- `backend/app/Http/Resources/StoreResource.php`
- `backend/app/Http/Resources/UserResource.php`
- `backend/app/Models/User.php`
- `backend/app/Models/UserLimit.php`
- `backend/database/migrations/2026_05_03_120000_create_user_limits_table.php`
- `backend/database/seeders/SubscriptionSeeder.php`
- `backend/routes/api.php`
- `components/store/storefront-client.tsx`
- `components/store/cart-drawer.tsx`
- `components/dashboard/users-table.tsx`
- `lib/types.ts`
- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `.ai/PROJECT_CONTEXT.md`
- `.ai/SKILLS.md`
- `.ai/FILE_INDEX.md`
- `.ai/API_MAP.md`
- `.ai/DATABASE_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/AGENT_RULES.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Removed order-limit enforcement from public and authenticated order creation.
- Kept `orders_per_month` as a non-blocking legacy no-op inside `SubscriptionService` so future accidental calls cannot block orders.
- Added `user_limits` table/model and custom per-user limit pricing formula.
- Added admin create/edit custom limit calculator for store-owner users.
- Added custom `/billing/calculate` support and `PUT /admin/users/{user}/limits`.
- Added product category/product type slug fields and stable storefront filtering by id/slug instead of display name only.
- Added store branding API aliases for `profilePhotoUrl` and `coverPhotoUrl`.
- Added storefront/admin translation keys across English, Arabic, and Kurdish.

Docs:

- Updated `.ai/PROJECT_CONTEXT.md`, `.ai/SKILLS.md`, `.ai/FILE_INDEX.md`, `.ai/API_MAP.md`, `.ai/DATABASE_MAP.md`, `.ai/FEATURE_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, `.ai/AGENT_RULES.md`, and `.ai/CHANGELOG_AI.md`.

Checks:

- PHP syntax checks for changed backend files: passed.
- Locale JSON validation: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `php artisan migrate --force`: applied `2026_05_03_120000_create_user_limits_table`.
- `php artisan test`: still blocked by missing SQLite PDO for Al-Waseet feature tests; 2 tests passed before the known driver failure group.
- `npm run lint`: blocked because `eslint` is not installed.
- PM2 `storify-store` and `storify-backend` restarted.
- Local smoke check `http://127.0.0.1:3001/store/test`: `200 OK`.

Notes:

- `Skills.sh` was not found.
- Remaining work: audit/history for custom limit edits, provider checkout for custom invoices, checkout feature tests, and explicit delivery/checkout-disabled store settings if the product owner wants those states beyond existing store/user active status.

## 2026-05-03

Task:
Store Main Page UI/UX Improvement

Reason:
User requested a targeted customer-facing storefront redesign for higher conversion, better product discovery, mobile UX, and performance without rewriting the whole project.

Files:

- `app/store/[slug]/page.tsx`
- `components/store/storefront-client.tsx`
- `components/store/cart-drawer.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/API_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Passed public storefront `sections` from the server page to `StorefrontClient`.
- Rebuilt the main storefront surface around an image-led hero, trust signals, category tiles, featured products, best sellers, low stock, trending, new arrivals, and a complete searchable catalog.
- Added category, price, and sort controls with mobile search/filter access.
- Upgraded product cards with fixed media ratio, discount badges, low-stock urgency, rating display, visible quick-add, and responsive CDN width hints for Bunny media.
- Added a mobile sticky cart bar.
- Updated cart drawer to accept already-loaded store contact data and avoid a duplicate public store fetch on the main storefront.
- Changed the public store server fetch from disabled caching to short revalidation with a storefront tag.

Docs:

- Updated `.ai/FILE_INDEX.md`, `.ai/FEATURE_MAP.md`, `.ai/API_MAP.md`, `.ai/BUGS_AND_RISKS.md`, `.ai/NEXT_ACTIONS.md`, and `.ai/CHANGELOG_AI.md`.

Checks:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check` on storefront/docs files: passed after whitespace cleanup.
- `npm run lint`: blocked because `eslint` is not installed in project dependencies.
- PM2 `storify-store` restarted.
- Local smoke check `http://127.0.0.1:3001/store/test`: `200 OK`.

Notes:

- `Skills.sh` was not found.
- Product card/cart totals remain customer UX estimates only; `/public/orders` remains the server-authoritative checkout path.
- Remaining storefront work: real reviews/social proof, post-order confirmation screen, product slugs scoped to store, cache invalidation on product/store changes, and buyer-auth cleanup.

## 2026-05-03

Task:
Stores UI/UX Improvement

Reason:
User requested a targeted Stores module redesign using project memory and real Stores files, without rewriting the full project.

Stores files read:

- `app/dashboard/stores/page.tsx`
- `components/dashboard/stores-table.tsx`
- `app/dashboard/settings/page.tsx`
- `components/dashboard/shell-topbar.tsx`
- `components/dashboard/sidebar.tsx`
- `lib/data-context.tsx`
- `lib/types.ts`
- `lib/store-utils.ts`
- `lib/subscription-utils.ts`
- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/StoreController.php`
- `backend/app/Http/Requests/StoreRequest.php`
- `backend/app/Http/Resources/StoreResource.php`
- `backend/app/Models/Store.php`
- `backend/app/Http/Middleware/TenantMiddleware.php`
- `backend/app/Services/SubscriptionService.php`

Files changed:

- `components/dashboard/stores-table.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/API_MAP.md`
- `.ai/DATABASE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Replaced table-only Stores list with responsive operational store cards.
- Added visible store metrics, active/inactive filtering, search by store/slug/owner, and sort by newest/name/products/orders.
- Added plan capacity usage and disabled create flow with upgrade prompt when the store limit is reached.
- Added clear enter-store, products, orders, settings, and storefront actions.
- Replaced browser delete confirmation with app alert-dialog confirmation.
- Improved Stores loading and empty states.

APIs:
No API contract changed. `.ai/API_MAP.md` was updated to document current Stores frontend consumers and limit-error expectations.

DB:
No DB schema changed. `.ai/DATABASE_MAP.md` was updated with Stores business rules and remaining JSON validation risk.

Checks:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check` on Stores/docs files: passed after whitespace cleanup.
- `npm run lint`: blocked because `eslint` is not installed in project dependencies.
- PM2 `storify-store` restarted.
- Local smoke check `http://127.0.0.1:3001/dashboard/stores`: `200 OK`.

Notes:

- `Skills.sh` was not found; existing `.ai/SKILLS.md` rules were used.
- Remaining Stores work: refactor create/edit wizard styling, split store settings into clearer sections, and avoid pre-create media uploads using `storeId=0`.

## 2026-05-03

Task:
Professional dashboard UI/UX redesign pass with documentation-first dashboard audit.

Reason:
User requested a targeted dashboard redesign using real dashboard files and `.ai` memory, with better enterprise SaaS hierarchy, navigation, loading/empty states, role-aware UX, and updated AI documentation.

Dashboard files read:

- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/products/page.tsx`
- `app/dashboard/orders/page.tsx`
- `app/dashboard/stores/page.tsx`
- `app/dashboard/product-types/page.tsx`
- `app/dashboard/users/page.tsx`
- `app/dashboard/buyers/page.tsx`
- `app/dashboard/employees/page.tsx`
- `app/dashboard/settings/page.tsx`
- `app/dashboard/billing/page.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/shell-topbar.tsx`
- `components/dashboard/header.tsx`
- `components/dashboard/stats-cards.tsx`
- `components/dashboard/recent-activity.tsx`
- `components/dashboard/products-table.tsx`
- `components/dashboard/orders-table.tsx`
- `components/dashboard/stores-table.tsx`
- `components/dashboard/users-table.tsx`
- `components/dashboard/employees-table.tsx`
- `components/dashboard/buyers-table.tsx`
- `lib/data-context.tsx`
- `lib/auth-context.tsx`
- `lib/api-client.ts`
- `lib/dashboard-context.tsx`
- `lib/types.ts`

Files changed:

- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/products/page.tsx`
- `app/dashboard/orders/page.tsx`
- `app/dashboard/stores/page.tsx`
- `app/dashboard/product-types/page.tsx`
- `app/dashboard/users/page.tsx`
- `app/dashboard/buyers/page.tsx`
- `app/dashboard/employees/page.tsx`
- `app/globals.css`
- `components/dashboard/page-header.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/shell-topbar.tsx`
- `components/dashboard/header.tsx`
- `components/dashboard/stats-cards.tsx`
- `components/dashboard/recent-activity.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/API_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

UI/UX improvements:

- Added shared `DashboardPageHeader` for consistent page hierarchy and actions.
- Refined dashboard layout spacing, loading shell, and background treatment.
- Cleaned sidebar active states, workspace identity, mobile drawer behavior, and user summary.
- Added topbar section label plus data sync/error indicator.
- Redesigned dashboard overview with role-aware focus cards, cleaner quick actions, and employee catalog-only panels.
- Simplified metric cards and activity/top-store empty states.
- Added product section local search, scoped counts, and a no-results state.

Bugs fixed:

- Employee dashboard overview no longer shows settings/order-oriented actions or order metrics.
- Legacy `components/dashboard/header.tsx` no longer uses full-page reloads for internal dashboard navigation.
- Product section page now supports local search instead of forcing users to scan all category cards.

APIs:
No API contract changed. `.ai/API_MAP.md` was updated to document dashboard frontend consumers and unified bootstrap UX risk.

DB:
None.

Checks:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check` on changed dashboard/docs files: passed.
- `npm run lint`: blocked because `eslint` is not installed in project dependencies.
- PM2 `storify-store` restarted.
- Local smoke checks on port 3001 returned `200 OK` for `/dashboard`, `/dashboard/products`, `/dashboard/product-types`, and `/dashboard/orders`.

Remaining risks:

- `dashboard/init` is still a large unified payload.
- Older settings/billing/store forms still use heavier visual styling and need the same shared form/table system.
- Browser `confirm()` remains in several table components.
- Backend PHP test suite was not run because this pass changed frontend/dashboard UI only; the known environment issue is missing SQLite PDO.

## 2026-05-03

Task:
Improve dashboard shell navigation/search and fix product form data-context usage.

Reason:
Dashboard sections felt unreliable because the topbar search was non-functional, some internal actions forced full page reloads, and the product form used nested `useData()` calls inside render helper paths.

Files:

- `components/dashboard/shell-topbar.tsx`
- `components/dashboard/products-table.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Added role-aware global dashboard search for products, categories, orders, and stores.
- Replaced topbar internal full reload navigation with Next router navigation.
- Hid account settings navigation from employees and suppressed order notifications for employee catalog-only accounts.
- Moved product type/category data access to top-level `useData()` destructuring instead of nested hook calls.

APIs:
None.

DB:
None.

Notes:
`npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. PM2 `storify-store` was restarted; local `/dashboard`, `/dashboard/products`, and `/dashboard/product-types` returned `200 OK` on port 3001. `Skills.sh` was not found.

## 2026-05-03

Task:
Restrict employee dashboard/API access to products and categories and fix first-click dashboard loading.

Reason:
User reported that employee users should only manage products/categories for the store, and some dashboard sections did not work or did not load on first click.

Files:

- `app/dashboard/layout.tsx`
- `app/dashboard/product-types/page.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/products-table.tsx`
- `lib/data-context.tsx`
- `backend/app/Http/Controllers/Api/DashboardController.php`
- `backend/app/Http/Controllers/Api/ProductController.php`
- `backend/app/Http/Controllers/Api/CategoryController.php`
- `backend/app/Http/Controllers/Api/ProductTypeController.php`
- `backend/app/Http/Controllers/Api/OrderController.php`
- `backend/app/Http/Controllers/Api/BuyerController.php`
- `backend/app/Http/Controllers/Api/StoreController.php`
- `.ai/API_MAP.md`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Employee dashboard access now redirects to `/dashboard/products` unless the route is products or product types/categories.
- Employee sidebar now only shows Products and Product Sections.
- Dashboard data loading is path-aware, fixing dashboard entry after skipped public/storefront loads.
- Employee dashboard init payload excludes orders, buyers, and subscriptions.
- Employees can create/update products and category rows for owner stores, but cannot delete products/categories or post to Telegram.
- Employees are denied order, buyer, store-management, and Telegram store-setting APIs.
- Product show now validates tenant ownership.
- Product types page now supports sub-category editing and hides delete actions for employees.

APIs:

- Updated employee behavior for `/dashboard/init`, `/products`, `/product-types`, `/categories`, `/orders`, `/buyers`, and `/stores`.

DB:

- No schema change.

Checks:

- `npx tsc --noEmit` passed.
- `npm run build` passed.
- PHP syntax checks passed for changed controllers.
- `git diff --check` passed.
- `php artisan test` still fails because the environment is missing SQLite PDO; 2 tests passed before the Al-Waseet SQLite-backed feature tests failed with `could not find driver`.
- PM2 `storify-store` and `storify-backend` restarted.
- Local `/dashboard`, `/dashboard/products`, and `/dashboard/product-types` returned `200`.

Notes:

- No translated owner-input fields were added.

## 2026-05-03

Task:
Restrict employee management to store owners and add subscription price calculation to admin user creation.

Reason:
User clarified that employees belong to store owners and requested subscription management with price calculator when adding a new user.

Files:

- `backend/app/Http/Controllers/Api/AdminController.php`
- `components/dashboard/users-table.tsx`
- `app/dashboard/employees/page.tsx`
- `components/dashboard/sidebar.tsx`
- `lib/data-context.tsx`
- `.ai/API_MAP.md`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Admin user creation now accepts optional plan, billing interval, and usage quantities for store-owner accounts.
- Backend creates the store owner and initial subscription in one transaction and stores the calculated invoice in subscription metadata.
- Admin Users dialog now loads active plans, calls `/billing/calculate`, and previews base/usage pricing before creating a tenant owner.
- Employees page and sidebar are restricted to store owners; platform admins manage tenant owners through Users/Billing.
- Dashboard data context no longer hydrates admin employee state.

APIs:

- Updated `/admin/users` request behavior for optional subscription creation.

DB:

- No schema change.

Checks:

- `npx tsc --noEmit` passed.
- `npm run build` passed.
- PHP syntax check for `AdminController.php` passed.
- `git diff --check` passed for changed files.
- PM2 `storify-store` and `storify-backend` restarted.
- Local `/dashboard/users`, `/dashboard/employees`, and `/api/v1/billing/calculate` returned `200`.

Notes:

- No translated owner-input fields were added.

## 2026-05-03

Task:
Improve and fix dashboard resilience.

Reason:
Selected because users reported dashboard sections missing, unexpected logout-like behavior, and dashboard data failing after login/no-token states.

Files:

- `lib/data-context.tsx`
- `app/dashboard/error.tsx`
- `app/dashboard/loading.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Dashboard data bootstrap now waits for auth bootstrap and avoids protected dashboard calls when no token exists.
- Stale dashboard data and selected-store state are cleared when the user is unauthenticated.
- Owner/admin dashboard employee table state is populated from dashboard users or the employee API.
- Dashboard debug logging is disabled in production unless `NEXT_PUBLIC_DEBUG=true`.
- Added dashboard route-level loading and error boundaries.

APIs:

- None.

DB:

- None.

Checks:

- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `git diff --check` passed for changed application files.
- PM2 `storify-store` restarted on port 3001.
- Local `/dashboard`, `/dashboard/product-types`, and `/dashboard/employees` returned `200`.

Notes:

- Backend tests were not rerun for this frontend-only task; the known environment issue remains missing SQLite PDO.

## 2026-05-03

Task:
Complete token revocation for password changes and account suspension/inactivation.

Reason:
Selected because `.ai/NEXT_ACTIONS.md` and `.ai/BUGS_AND_RISKS.md` identified auth lifecycle revocation as the highest safe security task after logout endpoints were added.

Files:

- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/ProfileController.php`
- `backend/app/Http/Controllers/Api/AdminController.php`
- `backend/app/Http/Controllers/Api/EmployeeController.php`
- `app/dashboard/settings/page.tsx`
- `.ai/FILE_INDEX.md`
- `.ai/API_MAP.md`
- `.ai/FEATURE_MAP.md`
- `.ai/BUGS_AND_RISKS.md`
- `.ai/NEXT_ACTIONS.md`
- `.ai/CHANGELOG_AI.md`

Changes:

- Login and refresh now reject inactive/suspended accounts with `ACCOUNT_INACTIVE`.
- Refresh for inactive accounts deletes the refresh token and revokes the user's tokens.
- Self password change revokes all Sanctum tokens and returns `SESSION_REVOKED`; settings UI logs out after success.
- Admin password changes and user suspension revoke target-user tokens.
- Employee password changes and inactive status revoke employee tokens.

APIs:

- Updated auth/profile behavior for `/auth/login`, `/auth/refresh`, and `/profile/password`.

DB:

- None.

Notes:

- `npx tsc --noEmit`, `npm run build`, PHP syntax checks, route listing, and smoke checks passed.
- `php artisan test` still fails because SQLite PDO is missing for Al-Waseet feature tests; 2 tests pass before that environment blocker.
- PM2 restarted `storify-store` on port 3001 and `storify-backend`.

## 2026-05-03

- Task summary: Completed concrete missing production route files and lifecycle logic for health, cron, auth logout, and billing checkout handoff.
- Files created/updated:
  - `app/api/health/route.ts`
  - `app/api/cron/cleanup/route.ts`
  - `app/api/cron/worker/route.ts`
  - `backend/routes/api.php`
  - `backend/app/Http/Controllers/Api/BillingController.php`
  - `app/dashboard/billing/page.tsx`
  - `lib/auth-context.tsx`
  - `.ai/FILE_INDEX.md`
  - `.ai/API_MAP.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/NEXT_ACTIONS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: yes. Added logout/logout-all docs, operations route docs, and updated billing checkout response behavior.
- DB docs updated: no DB schema changed.
- Notes: `npx tsc --noEmit`, `npm run build`, PHP syntax checks, Laravel route listing, and smoke checks passed. `php artisan test` still fails because the environment lacks the SQLite PDO driver for the Al-Waseet feature tests; 2 tests passed before that blocker. PM2 restarted `storify-store` on port 3001 and `storify-backend`; `/api/health` returned `200`, cron route rejected unauthorized access, unauthenticated `/api/v1/auth/user` returned `401`, and `/dashboard/billing` returned `200`.

## 2026-05-02

- Task summary: Fixed `/dashboard/product-types` catalog dashboard route and product type/category tenant behavior.
- Files created/updated:
  - `app/dashboard/product-types/page.tsx`
  - `backend/app/Http/Controllers/Api/DashboardController.php`
  - `backend/app/Http/Controllers/Api/ProductTypeController.php`
  - `backend/app/Http/Controllers/Api/CategoryController.php`
  - `backend/app/Http/Resources/ProductTypeResource.php`
  - `backend/app/Http/Resources/CategoryResource.php`
  - `.ai/FILE_INDEX.md`
  - `.ai/API_MAP.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: yes. Product type/category resources now document owner/employee scope, global read-only behavior for non-admin users, and implemented `show` routes.
- DB docs updated: no DB schema changed.
- Notes: Used `vercel-react-best-practices` for the React route fix. `npx tsc --noEmit`, `npm run build`, PHP syntax checks, and route smoke checks passed. `php artisan test --filter=ProductType` found no matching tests. PM2 restarted `storify-store` on port 3001 and `storify-backend`; local and live `/dashboard/product-types` returned `200`.

## 2026-05-02

- Task summary: Fixed dashboard `Authentication is required to select a store` error.
- Files created/updated:
  - `lib/api-client.ts`
  - `lib/data-context.tsx`
  - `.ai/FILE_INDEX.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: no API contract changed.
- DB docs updated: no DB schema changed.
- Notes: `X-Store-ID` is only sent with an auth token; safe GET tenant recovery includes `UNAUTHENTICATED_TENANT`; dashboard data waits for auth bootstrap. `npx tsc --noEmit` and `npm run build` passed; port 3001 was restarted and key routes returned `200`.

## 2026-05-02

- Task summary: Fixed unexpected logout while browsing dashboard sections caused by concurrent refresh-token rotation.
- Files created/updated:
  - `lib/api-client.ts`
  - `lib/auth-context.tsx`
  - `.ai/FILE_INDEX.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: no API contract changed.
- DB docs updated: no DB schema changed.
- Notes: `apiClient` now uses single-flight refresh, and auth bootstrap waits for silent refresh before releasing dashboard loading. `npx tsc --noEmit` and `npm run build` passed; port 3001 was restarted and key routes returned `200`.

## 2026-05-02

- Task summary: Fixed dashboard sections appearing missing/inaccessible due stale selected-store tenant headers.
- Files created/updated:
  - `lib/api-client.ts`
  - `lib/auth-context.tsx`
  - `.ai/FILE_INDEX.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: no API contract changed.
- DB docs updated: no DB schema changed.
- Notes: Login clears stale selected store. Safe GET requests clear stale selected store and retry once without `X-Store-ID` on `TENANT_ACCESS_DENIED`. `npx tsc --noEmit` and `npm run build` passed; port 3001 was restarted and key dashboard routes returned `200`.

## 2026-05-02

- Task summary: Fixed login route consistency for `https://store.blackt.uk/login` and dashboard unauthenticated redirects.
- Files created/updated:
  - `app/login/page.tsx`
  - `app/dashboard/layout.tsx`
  - `components/auth/protected-route.tsx`
  - `.ai/FILE_INDEX.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: no API contract changed.
- DB docs updated: no DB schema changed.
- Notes: Added a real `/login` route that reuses the root login screen. `npx tsc --noEmit` and `npm run build` passed. Port 3001 was restarted; local `/login` and `/dashboard` both returned `200 OK`. Live `https://store.blackt.uk/login` and `/dashboard` returned `200` headers.

## 2026-05-02

- Task summary: Improved and fixed dashboard behavior across admin, store owner, and employee roles.
- Files created/updated:
  - `app/dashboard/page.tsx`
  - `app/dashboard/stores/page.tsx`
  - `app/dashboard/orders/page.tsx`
  - `app/dashboard/buyers/page.tsx`
  - `app/dashboard/analytics/page.tsx`
  - `app/dashboard/discounts/page.tsx`
  - `app/dashboard/billing/page.tsx`
  - `app/dashboard/audit-logs/page.tsx`
  - `app/dashboard/employees/page.tsx`
  - `components/dashboard/access-restricted.tsx`
  - `components/dashboard/products-table.tsx`
  - `components/dashboard/recent-activity.tsx`
  - `components/dashboard/stats-cards.tsx`
  - `lib/data-context.tsx`
  - `lib/api-client.ts`
  - `lib/auth-context.tsx`
  - `lib/types.ts`
  - `middleware.ts`
  - `backend/routes/api.php`
  - `backend/app/Http/Resources/UserResource.php`
  - `.ai/FILE_INDEX.md`
  - `.ai/API_MAP.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: yes. Auth login response now documents `parentId` and `subscriptionPlan`; dashboard init frontend behavior documented.
- DB docs updated: no DB schema changed.
- Notes: `npx tsc --noEmit`, `npm run build`, and PHP syntax checks passed. Port 3001 server was restarted and `/dashboard` returned `200 OK`.

## 2026-05-02

- Task summary: Fixed `SubscriptionService::getActiveSubscription()` returning `__PHP_Incomplete_Class` from stale cached Eloquent models.
- Files created/updated:
  - `backend/app/Services/SubscriptionService.php`
  - `.ai/FILE_INDEX.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Skills.sh integrated: no. `Skills.sh` was not found.
- API docs updated: no API contract changed.
- DB docs updated: no DB schema changed.
- Notes: Active subscription cache now stores only a subscription id and hydrates a fresh model. PHP syntax check passed; direct Laravel invocation returned `App\Models\Subscription`.

## 2026-05-02

- Task summary: Created the initial `.ai` project memory system for Storify SaaS using previous architecture knowledge and targeted current-file inspection.
- Files created/updated:
  - `.ai/PROJECT_CONTEXT.md`
  - `.ai/SKILLS.md`
  - `.ai/FILE_INDEX.md`
  - `.ai/API_MAP.md`
  - `.ai/DATABASE_MAP.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/AGENT_RULES.md`
  - `.ai/CHANGELOG_AI.md`
  - `.ai/NEXT_ACTIONS.md`
  - `.ai/TASK_PROMPT_TEMPLATE.md`
- Skills.sh integrated: no. `Skills.sh` was not found; root `SKILL.md` was placeholder-only.
- API docs updated: yes.
- DB docs updated: yes.
- Notes: Documentation-only task. No application business logic, UI, package, or runtime changes were made.
## 2026-05-10

- Task summary: Implemented missing backend APIs for Flutter Dashboard readiness.
- Files created/updated:
  - `backend/routes/api.php`
  - `backend/routes/channels.php`
  - `backend/app/Http/Controllers/Api/StoreController.php`
  - `backend/app/Http/Controllers/Api/NotificationController.php`
  - `backend/app/Http/Controllers/Api/DeviceTokenController.php`
  - `backend/app/Http/Controllers/Api/BuyerController.php`
  - `backend/app/Http/Controllers/Api/MediaController.php`
  - `backend/app/Http/Controllers/Api/BillingController.php`
  - `backend/app/Http/Controllers/Api/AdminController.php`
  - `backend/app/Http/Controllers/Api/TelegramController.php`
  - `backend/app/Http/Controllers/Api/PublicController.php`
  - `backend/app/Models/Store.php`
  - `backend/app/Models/Buyer.php`
  - `backend/app/Models/DashboardNotification.php`
  - `backend/app/Models/DeviceToken.php`
  - `backend/app/Http/Resources/StoreResource.php`
  - `backend/app/Http/Resources/BuyerResource.php`
  - `backend/app/Http/Resources/NotificationResource.php`
  - `backend/app/Http/Resources/DeviceTokenResource.php`
  - `backend/app/Http/Requests/StoreRequest.php`
  - `backend/app/Services/NotificationService.php`
  - `backend/app/Listeners/SendOrderNotification.php`
  - `backend/database/migrations/2026_05_10_000001_add_flutter_dashboard_store_fields.php`
  - `backend/database/migrations/2026_05_10_000002_create_dashboard_notifications_table.php`
  - `backend/database/migrations/2026_05_10_000003_create_device_tokens_table.php`
  - `backend/database/migrations/2026_05_10_000004_add_buyer_management_fields.php`
  - `.ai/API_MAP.md`
  - `.ai/DATABASE_MAP.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`
  - `.ai/FLUTTER_DASHBOARD_BUILD_PROMPT.md`
  - `.ai/NEXT_ACTIONS.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/FILE_INDEX.md`
  - `.ai/CHANGELOG_AI.md`
- APIs added/fixed: store status/settings, Telegram settings/test, notification polling/read, device tokens, buyer update/blacklist, media delete/replace, `/billing/current` custom limits/pricing, admin broadcast, safe `/api/v1/docs`, realtime channel auth, admin-only Telegram webhook setup.
- DB migrations added/applied: store checkout/thread fields, dashboard notifications, device tokens, buyer notes/blacklist reason.
- Security/tenant fixes: all new store-scoped APIs verify owner/admin access; bot tokens are prohibited for store-owner requests and hidden from responses; no order limits were added.
- Checks run: PHP syntax checks for changed PHP files, `php artisan route:list --path=v1`, `php artisan migrate:status`, `php artisan migrate --force`, `php artisan test`.
- Test result note: `php artisan test` still fails in `AlWaseetMultiTenantTest` because SQLite PDO is unavailable for the in-memory test database; unrelated example tests pass.
- Remaining API gaps at that time: push sending worker, `/buyers/auth` decision, Bunny remote media cleanup, and Telegram webhook signature hardening. These were addressed or formally scoped in `.ai2` on 2026-05-11 and synced into `.ai`.

## 2026-05-11

- Task summary: Built the separate Storify Flutter Dashboard app shell and first endpoint-backed dashboard implementation inside the Flutter project.
- Files created/updated:
  - `pubspec.yaml`
  - `pubspec.lock`
  - `lib/main.dart`
  - `lib/app/app.dart`
  - `lib/app/bootstrap.dart`
  - `lib/app/router.dart`
  - `lib/core/api/api_client.dart`
  - `lib/core/api/api_error.dart`
  - `lib/core/api/api_response.dart`
  - `lib/core/auth/auth_session.dart`
  - `lib/core/auth/secure_token_store.dart`
  - `lib/core/config/app_config.dart`
  - `lib/core/localization/app_localizations.dart`
  - `lib/core/localization/locale_controller.dart`
  - `lib/core/models/models.dart`
  - `lib/core/store/selected_store_controller.dart`
  - `lib/core/theme/app_theme.dart`
  - `lib/core/widgets/app_shell.dart`
  - `lib/core/widgets/states.dart`
  - `lib/features/**`
  - `test/widget_test.dart`
  - `.ai/FILE_INDEX.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- APIs wired: `/auth/login`, `/auth/refresh`, `/auth/user`, `/auth/logout`, `/dashboard/init`, `/stores`, `/products`, `/products/{id}/telegram`, `/product-types`, `/categories`, `/orders`, `/orders/{id}/status`, `/buyers`, `/stores/{id}`, `/telegram/link-bot`, `/notifications`, `/notifications/{id}/read`, `/billing/current`, `/media`, `/admin/users`.
- Security/tenant decisions: access and refresh tokens use `flutter_secure_storage`; selected store id is persisted only after validation against `/dashboard/init` stores; `X-Store-ID` is injected only when a validated selected store exists; tenant errors clear selected store state; Telegram bot token and other secrets are never accepted or displayed.
- Localization: English, Arabic, and Kurdish static dashboard strings are centralized in `AppLocalizations`; Arabic and Kurdish use RTL direction.
- Checks run: `flutter analyze`, `flutter test`, `flutter build web`.
- Results: all three checks passed. Authenticated API smoke tests were not run because no safe backend test credentials were provided.

## 2026-05-11

- Task summary: Completed the Flutter Dashboard build prompt implementation pass and updated the Flutter API audit/build prompt status.
- Files created/updated:
  - `pubspec.yaml`
  - `pubspec.lock`
  - `lib/core/api/api_client.dart`
  - `lib/core/auth/auth_session.dart`
  - `lib/core/localization/app_localizations.dart`
  - `lib/core/models/models.dart`
  - `lib/features/admin/admin_pages.dart`
  - `lib/features/billing/billing_page.dart`
  - `lib/features/buyers/buyers_page.dart`
  - `lib/features/catalog/catalog_page.dart`
  - `lib/features/media/media_page.dart`
  - `lib/features/products/products_page.dart`
  - `lib/features/store_settings/store_settings_page.dart`
  - `lib/features/stores/stores_page.dart`
  - `lib/features/telegram/telegram_page.dart`
  - `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`
  - `.ai/FLUTTER_DASHBOARD_BUILD_PROMPT.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/FILE_INDEX.md`
  - `.ai/CHANGELOG_AI.md`
- Added workflows: multipart media upload/replace/delete, store branding/social/status/profile/password, product edit/delete/active toggle, catalog edit/delete, buyer edit/blacklist, Telegram settings/link/channel validation, billing usage/calculation, admin tabs for users/plans/features/subscriptions/settings/broadcast and user limits.
- Security/tenant decisions: still no backend/storefront rewrites; no secrets exposed; selected store validation remains the only source for `X-Store-ID`; tenant errors clear selected store.
- Remaining blockers: authenticated smoke tests need safe credentials; push sending worker, Bunny remote cleanup, Telegram webhook secret hardening, and `/buyers/auth` remain backend/runtime tasks.

## 2026-05-11

- Task summary: Completed the remaining Flutter-dashboard-side gaps requested after the main build pass.
- Files updated:
  - `lib/core/localization/app_localizations.dart`
  - `lib/features/admin/admin_pages.dart`
  - `lib/features/buyers/buyers_page.dart`
  - `lib/features/notifications/notifications_page.dart`
  - `lib/features/orders/orders_page.dart`
  - `lib/features/products/products_page.dart`
  - `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/CHANGELOG_AI.md`
- Added workflows: product detail dialog plus options/variants JSON payloads, order create/detail/edit/delete, buyer create/detail, notification device-token registration/deletion, and admin user create/edit.
- Follow-up from `.ai2`: queued push sender/worker, Telegram webhook secret hardening, Bunny remote cleanup queueing, and storefront `/buyers/auth` removal are documented as backend/runtime updates. Remaining work is production configuration and queue operation, not Flutter client implementation.

## 2026-05-11

- Task summary: Synced backend/runtime documentation updates from `.ai2` into `.ai`.
- Source checked:
  - `.ai2/FLUTTER_DASHBOARD_API_AUDIT.md`
  - `.ai2/API_MAP.md`
  - `.ai2/NEXT_ACTIONS.md`
  - `.ai2/DATABASE_MAP.md`
  - `.ai2/FEATURE_MAP.md`
  - `.ai2/BUGS_AND_RISKS.md`
  - `.ai2/CHANGELOG_AI.md`
- Docs updated:
  - `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`
  - `.ai/API_MAP.md`
  - `.ai/NEXT_ACTIONS.md`
  - `.ai/DATABASE_MAP.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/BUGS_AND_RISKS.md`
  - `.ai/CHANGELOG_AI.md`
- Backend/runtime status from `.ai2`: queued push delivery exists for registered web/android FCM and iOS APNs device tokens; Telegram webhook secret validation uses `TELEGRAM_WEBHOOK_SECRET` when configured; Bunny remote cleanup is queued for delete/replace; storefront `/buyers/auth` was removed and checkout remains guest-first.
- Note: this Flutter workspace does not contain the Laravel `backend/` or Next `components/` directories, so this was a documentation sync from `.ai2`, not a backend code verification.

## 2026-05-11

- Task summary: Updated Flutter Dashboard API configuration to use the production HTTPS API in debug and release.
- Files updated:
  - `lib/core/config/app_config.dart`
  - `.ai/FILE_INDEX.md`
  - `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`
  - `.ai/CHANGELOG_AI.md`
- API behavior: login now resolves to `https://store.blackt.uk/api/v1/auth/login`; local API base overrides were removed from the Flutter runtime config.

## 2026-06-13

- Task summary: Created a consolidated final feature inventory in the `.ai` folder.
- Files created/updated:
  - `.ai/ALL_FEATURES.md`
  - `.ai/FILE_INDEX.md`
  - `.ai/CHANGELOG_AI.md`
- Scope reviewed: existing `.ai` project memory, Laravel `/api/v1` routes, dashboard pages/components, public storefront routes/components, docs, and database notes.
- Output: `.ai/ALL_FEATURES.md` now summarizes implemented features, role rules, tenant/store behavior, storefront/catalog/orders/buyers/media/billing/admin/integration/ops features, known local-only or incomplete areas, and non-negotiable project rules.

## 2026-06-13

- Task summary: Added the first enterprise upgrade implementation slice without rebuilding existing modules.
- Files created/updated:
  - `backend/database/migrations/2026_06_13_000001_add_enterprise_domain_customer_notification_analytics_tables.php`
  - `backend/app/Models/GlobalCustomer.php`
  - `backend/app/Models/CustomerNotificationSubscription.php`
  - `backend/app/Models/CustomerNotificationCampaign.php`
  - `backend/app/Models/CustomerNotificationDelivery.php`
  - `backend/app/Models/AnalyticsEvent.php`
  - `backend/app/Services/DomainTenantService.php`
  - `backend/app/Services/CustomerRiskService.php`
  - `backend/app/Jobs/DispatchCustomerNotificationCampaign.php`
  - `backend/app/Http/Controllers/Api/DomainController.php`
  - `backend/app/Http/Controllers/Api/CustomerNotificationController.php`
  - `backend/app/Http/Controllers/Api/AnalyticsController.php`
  - `backend/app/Http/Controllers/Api/StoreController.php`
  - `backend/app/Http/Controllers/Api/PublicController.php`
  - `backend/app/Http/Controllers/Api/OrderController.php`
  - `backend/app/Http/Resources/StoreResource.php`
  - `backend/app/Http/Resources/BuyerResource.php`
  - `backend/app/Http/Resources/OrderResource.php`
  - `backend/app/Http/Resources/ProductResource.php`
  - `backend/routes/api.php`
  - `middleware.ts`
  - `docs/ENTERPRISE_UPGRADE_PLAN.md`
  - `docs/API_ENTERPRISE_FEATURES.md`
  - `docs/API_INDEX.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/DATABASE_MAP.md`
  - `.ai/API_MAP.md`
  - `.ai/FILE_INDEX.md`
  - `.ai/CHANGELOG_AI.md`
- Added features: subdomain/custom-domain store fields and validation, reserved subdomain protection, cache-backed host tenant resolver, public domain resolver, global phone-based customer risk, risk fields on buyer/order resources, customer notification subscriptions/campaigns/deliveries, queue-based campaign dispatch staging, public analytics events, expanded owner/platform analytics, and middleware reserved-host protection.
- Compatibility/security: existing `/store/{slug}` and `/api/v1` behavior remains; no order SaaS limits were added; provider secrets and notification endpoint payloads remain hidden/encrypted.

## 2026-06-13

- Task summary: Completed the second enterprise hardening slice for migration safety, domain/storefront integration, dashboard UI, notification opt-in, analytics UI, tests, and docs.
- Files created/updated:
  - `app/store/[slug]/storefront-data.ts`
  - `app/store/[slug]/page.tsx`
  - `app/store/[slug]/product/[productId]/page.tsx`
  - `app/dashboard/analytics/page.tsx`
  - `app/dashboard/customer-notifications/page.tsx`
  - `app/dashboard/settings/page.tsx`
  - `components/dashboard/store-domain-panel.tsx`
  - `components/dashboard/orders-table.tsx`
  - `components/dashboard/sidebar.tsx`
  - `components/store/customer-notification-opt-in.tsx`
  - `components/store/storefront-client.tsx`
  - `components/dashboard/buyers-table.tsx`
  - `lib/types.ts`
  - `backend/app/Http/Controllers/Api/AnalyticsController.php`
  - `backend/app/Http/Controllers/Api/CustomerNotificationController.php`
  - `backend/database/migrations/2026_06_13_000001_add_enterprise_domain_customer_notification_analytics_tables.php`
  - `backend/tests/Feature/EnterpriseUpgradeApiTest.php`
  - `docs/ENTERPRISE_UPGRADE_PLAN.md`
  - `docs/API_ENTERPRISE_FEATURES.md`
  - `.ai/FEATURE_MAP.md`
  - `.ai/API_MAP.md`
  - `.ai/FILE_INDEX.md`
  - `.ai/CHANGELOG_AI.md`
- Added behavior: host-first storefront tenant resolution with slug fallback, canonical/OG resolved-host URLs, Settings Domains tab, reserved-domain errors, customer risk badges on order list/detail, manual high-risk warning, customer notification campaign drafts/scheduling/queueing UI, storefront notification opt-in/unsubscribe UI, backend analytics range support and query caching, analytics dashboard API consumption, migration index guards, and focused enterprise feature tests.
- Verification: PHP syntax checks passed; `php artisan route:list --path=api/v1` passed; `php artisan migrate --pretend` passed; `npx tsc --noEmit --pretty false` passed; `npm run build` passed. `npm run lint` could not run because `eslint` is not installed. `php artisan test --filter EnterpriseUpgradeApiTest` is blocked by missing SQLite PDO before assertions run.

## 2026-06-13

- Task summary: Completed the production-readiness slice for lint/test setup, queue reliability, analytics aggregation, health/ops observability, notification gates, and docs.
- Files created/updated:
  - `eslint.config.mjs`
  - `backend/.env.testing.example`
  - `backend/database/migrations/2026_06_13_000002_add_production_readiness_tables.php`
  - `backend/app/Models/StoreDailyStat.php`
  - `backend/app/Models/ProductDailyStat.php`
  - `backend/app/Models/NotificationDailyStat.php`
  - `backend/app/Models/PlatformDailyStat.php`
  - `backend/app/Models/SystemEvent.php`
  - `backend/app/Models/SchedulerHeartbeat.php`
  - `backend/app/Services/AnalyticsAggregationService.php`
  - `backend/app/Services/SystemEventService.php`
  - `backend/app/Jobs/AggregateDailyAnalytics.php`
  - `backend/app/Console/Commands/AggregateDailyAnalyticsCommand.php`
  - `backend/app/Http/Controllers/Api/OpsController.php`
  - `app/api/health/deep/route.ts`
  - `app/dashboard/ops/page.tsx`
  - `backend/tests/Feature/ProductionReadinessApiTest.php`
  - `docs/LOCAL_TESTING.md`
  - `docs/PRODUCTION_READINESS.md`
  - plus route/controller/service/job/docs `.ai` updates.
- Added behavior: real ESLint config and dependencies, documented test env/PHP extensions, deep health endpoints, admin operations dashboard, sanitized system events, scheduler heartbeat, daily analytics aggregate tables/job/command/schedule, aggregate-backed dated analytics ranges, notification campaign feature gates, campaign/push/Bunny failure logging, Telegram duplicate-post guard, public route throttles, and admin ops summary.
- Verification: `composer validate` passed; PHP syntax checks passed; `php artisan route:list --path=api/v1 --no-ansi` passed; `php artisan migrate --pretend --no-ansi` passed; `php artisan list` shows `analytics:aggregate-daily`; `npx tsc --noEmit --pretty false` passed; `npm run lint -- --max-warnings=0` passed; `npm run build` passed with the existing Next 16 middleware deprecation warning. `php artisan test --filter ProductionReadinessApiTest --no-ansi` is still blocked before assertions by missing SQLite PDO (`could not find driver`).

## 2026-06-13

- Task summary: Completed the launch-readiness Nuxt transition slice without replacing the existing production frontend.
- Files created/updated:
  - `frontend-nuxt/`
  - `frontend-nuxt/package.json`
  - `frontend-nuxt/nuxt.config.ts`
  - `frontend-nuxt/app.vue`
  - `frontend-nuxt/pages/index.vue`
  - `frontend-nuxt/pages/dashboard/index.vue`
  - `frontend-nuxt/composables/useTenantResolver.ts`
  - `frontend-nuxt/composables/useSeo.ts`
  - `frontend-nuxt/plugins/api.ts`
  - `frontend-nuxt/stores/auth.ts`
  - `frontend-nuxt/stores/tenant.ts`
  - `frontend-nuxt/i18n/locales/*.json`
  - `frontend-nuxt/.env.example`
  - `backend/.env.testing.mysql`
  - `docs/NUXT_MIGRATION_PLAN.md`
  - `docs/API_CLIENT_CONTRACT.md`
  - `docs/SECURITY_LAUNCH_CHECKLIST.md`
  - `docs/PRODUCTION_READINESS.md`
  - `docs/LOCAL_TESTING.md`
  - `docs/API_INDEX.md`
  - `.gitignore`
  - `eslint.config.mjs`
  - `tsconfig.json`
  - `.ai/*`
- Added behavior/docs: audited current frontend direction, confirmed root app is still production-facing Next.js, added isolated Nuxt 3 skeleton with host-resolution proof, documented Nuxt migration route/order/state/API/i18n/PWA/SEO plan, standardized API client contract, added production deployment checklist, added SQLite and dedicated MySQL test-environment paths, and added launch security checklist.
- Verification: `composer validate` passed; `php -l backend/routes/api.php backend/routes/console.php` passed; `php artisan route:list --path=api/v1 --no-ansi` passed; `php artisan migrate --pretend --no-ansi` passed; root `npx tsc --noEmit --pretty false` passed; root `npm run lint -- --max-warnings=0` passed; root `npm run build` passed with the existing Next 16 middleware deprecation warning; the earlier `frontend-nuxt npm install`, `npm run typecheck`, and `npm run build` passed before the Nuxt app was converted to JavaScript-only. PHP feature tests were not run because `pdo_sqlite` is absent and no dedicated testing DB credentials were configured.

## 2026-06-13

- Task summary: Fixed the Nuxt storefront styling pipeline and forced the store-host Nuxt dev server onto port 3001.
- Files/config updated:
  - `frontend-nuxt/package.json`
  - `frontend-nuxt/package-lock.json`
  - `frontend-nuxt/nuxt.config.js`
  - `frontend-nuxt/tailwind.config.js`
  - `frontend-nuxt/assets/css/main.css`
  - `frontend-nuxt/scripts/ensure-port-3001-free.js`
  - `frontend-nuxt/composables/useTenantResolver.js`
  - `frontend-nuxt/composables/useStorefrontData.js`
  - `frontend-nuxt/README.md`
  - `docs/LOCAL_TESTING.md`
  - `docs/DEPLOYMENT_NUXT.md`
  - `docs/NUXT_MIGRATION_PLAN.md`
  - `docs/PRODUCTION_READINESS.md`
  - `/etc/apache2/sites-available/store.blackt.uk.conf`
- Added behavior: Tailwind is installed and loaded from global CSS; Nuxt emits external CSS assets in production builds; `npm run dev` is guarded so port 3001 must be free and cannot silently move to 3002; Vite accepts the real store host; Apache proxies `/_nuxt/` and `/api/v1/` correctly; host fallback maps `teststore.blackt.uk` to the existing `teststore` public store slug when backend domain rows are not populated.
- Runtime notes: PM2 `storify-store` was stopped, not deleted, so Nuxt can own port 3001. Pending Laravel migrations were applied because the backend domain resolver expected the enterprise-domain schema columns.
- Verification: `frontend-nuxt npm install` passed with the existing Node 20 engine warning for `rollup-plugin-visualizer` and existing audit warnings; `npm run lint` passed; `npm run build` passed and emitted `_nuxt/entry.DdrgJvxJ.css`; `npm run dev` is running on port 3001; `https://teststore.blackt.uk/` returns `x-powered-by: Nuxt`, renders the real `BLack` storefront, CDN logo/cover/product media, product/category sections, SEO/JSON-LD, and no `_next` references. No Nuxt source `.ts` or `.tsx` files were found outside generated/dependency folders.
