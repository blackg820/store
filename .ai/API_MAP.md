# API Map

Last updated: 2026-05-10

Base path: `/api/v1`. Current production Next frontend calls are proxied through `app/api/v1/[...path]/route.ts` to Laravel. The future Nuxt frontend uses `frontend-nuxt/plugins/api.js` and configurable Laravel base URLs.

Flutter Dashboard note: `.ai/FLUTTER_DASHBOARD_API_AUDIT.md` is the detailed endpoint-by-endpoint audit for the future separate Flutter Dashboard app. Future Flutter work must read that file before building API clients, models, or pages.

Nuxt migration note: `docs/NUXT_MIGRATION_PLAN.md`, `docs/FRONTEND_NUXT_ONLY.md`, `docs/DEPLOYMENT_NUXT.md`, and `docs/API_CLIENT_CONTRACT.md` define the future Nuxt frontend path. The current production frontend remains Next.js; Nuxt lives separately in `frontend-nuxt/` and is JavaScript-only.

Standard response shape is generally:

```json
{ "success": true, "message": "...", "data": {} }
```

Error and limit responses may include:

```json
{ "success": false, "code": "PLAN_LIMIT_REACHED", "message": "...", "details": {}, "upgrade": {} }
```

## Auth

| Method | Path | Handler | Request | Response | Auth | Checks | Files | Known Issues |
|---|---|---|---|---|---|---|---|---|
| POST | `/auth/login` | closure in `routes/api.php` | `email`, `password` | accessToken, refreshToken, user including `parentId` and `subscriptionPlan` | No | password hash, active account status, user lookup | `backend/routes/api.php`, `UserResource.php`, `lib/auth-context.tsx` | Suspended/inactive accounts return `ACCOUNT_INACTIVE`. |
| POST | `/auth/refresh` | closure in `routes/api.php` | `refreshToken` | new access/refresh token | No | Sanctum token lookup, refresh ability, expiry, active account status | `backend/routes/api.php` | Inactive accounts revoke tokens and return `ACCOUNT_INACTIVE`. |
| GET | `/auth/user` | closure | none | `UserResource` | Yes | Sanctum | `backend/routes/api.php` | Aligned with frontend auth DTO. |
| POST | `/auth/logout` | closure | optional `refreshToken` | success | Yes | deletes current access token and matching refresh token | `backend/routes/api.php`, `lib/auth-context.tsx` | Frontend calls best-effort before local cleanup. |
| POST | `/auth/logout-all` | closure | none | success | Yes | deletes all Sanctum tokens for user | `backend/routes/api.php` | Use for account security/session revoke flows. |
| PATCH | `/profile/password` | `ProfileController@updatePassword` | currentPassword, newPassword | success + `SESSION_REVOKED` | Yes | current password, password policy | `ProfileController`, settings page | Deletes all user tokens and frontend logs out after success. |

## Public Storefront

| Method | Path | Handler | Request | Response | Auth | Checks | Files | Known Issues |
|---|---|---|---|---|---|---|---|---|
| GET | `/public/store/{slug}` | `PublicController@store` | slug | store (`logoUrl`, `coverUrl`, `status`, `isOpen`, `checkoutEnabled`), products, categories, productTypes, sections | No | active store, owner not suspended | `PublicController`, `ProductResource` | Needs caching/invalidation and richer reviews. |
| GET | `/public/product/{id}` | `PublicController@product` | product id, optional `storeSlug` query | product resource | No | active product/store/owner; optional slug must match product store | `PublicController` | Product id is still global, but product detail routes pass `storeSlug` to avoid rendering a product under the wrong storefront path. |
| GET | `/public/settings` | `PublicController@settings` | none | site settings | No | none | `PublicController` | Reads global settings. |
| POST | `/public/orders` | `PublicController@submitOrder` | storeId, buyerName, buyerPhone, governorate, district, items | order id/data | No | store active, owner active, product belongs to store, product active, stock variant | `PublicController` | No SaaS order limits. Phone/address validation can be stronger. |

Frontend storefront consumers:

- `app/store/[slug]/storefront-data.ts` fetches `/public/store/{slug}` once per route and is shared by profile/products/categories/category route pages.
- `app/store/[slug]/page.tsx` uses typed storefront props and prefers `coverUrl || logoUrl` for metadata images.
- `app/store/[slug]/products/page.tsx`, `app/store/[slug]/categories/page.tsx`, and `app/store/[slug]/category/[id]/page.tsx` reuse the same public API response and pass route-specific initial view/category props to `StorefrontClient`.
- `app/store/[slug]/product/[productId]/page.tsx` fetches `/public/store/{slug}` and `/public/product/{id}?storeSlug={slug}` on the server. On store subdomains, `middleware.ts` rewrites `/product/{id}` to this route. The route passes plain `{ slug, productId }` and initial API data to the client; the client should normalize optional arrays/numbers but must not loosen the backend tenant check.
- `components/store/storefront-client.tsx` uses `logoUrl`/`coverUrl` for profile branding, `status`/`isOpen` for the public badge, and `sections.featuredProducts`/`sections.bestSellers` when present with derived recent-product fallbacks.
- `components/store/cart-drawer.tsx` submits `/public/orders`; public checkout totals must be recalculated by the backend. It accepts optional store contact data from the main storefront to avoid a duplicate `/public/store/{slug}` fetch and uses locale keys for checkout/WhatsApp order copy.
- Storefront client/cart prices are display and cart estimates only, not source of truth. Product detail applies matched variant price/stock for UX, while backend checkout still validates variant availability and recalculates totals.

## Billing

| Method | Path | Handler | Request | Response | Auth | Checks | Files | Known Issues |
|---|---|---|---|---|---|---|---|---|
| POST | `/billing/calculate` | `BillingController@calculate` | custom `limits`, `pricing`, `basePriceCents`, `currency`; legacy optional planId, quantities | invoice simulation | Public route currently | plan lookup only for legacy planId mode | `BillingController`, `SubscriptionService` | Public calculate may need rate limiting. Custom limit pricing is preferred. |
| GET | `/billing/current` | `BillingController@current` | none | subscription, usage, unlimited | Yes | tenant owner | `BillingController` | Needs customer invoice history later. |
| GET | `/billing/usage` | `BillingController@usage` | none | live usage | Yes | tenant owner | `BillingController` | Usage partly live-counted, partly recorded. |
| POST | `/billing/checkout-session` | `BillingController@checkoutSession` | planId | provider redirect or manual approval handoff | Yes | active plan lookup, owner account | `BillingController`, billing page | Uses `BILLING_CHECKOUT_URL` if configured; otherwise returns WhatsApp/manual approval payload. |

## Operations

| Method | Path | Handler | Request | Response | Auth | Checks | Files | Known Issues |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/health` | Next route handler | none | Next/backend health | No | Laravel `/up` | `app/api/health/route.ts` | Keep response secret-free. |
| GET | `/api/health/deep` | Next route handler | none | Next/backend deep health | No | Laravel `/api/v1/ops/health/deep` | `app/api/health/deep/route.ts`, `OpsController` | Keep response secret-free; may return 503 when scheduler/Bunny are degraded. |
| GET | `/ops/health` | `OpsController@health` | none | lightweight API health | No | app boot | `OpsController` | Secret-free. |
| GET | `/ops/health/deep` | `OpsController@deepHealth` | none | DB/cache/queue/storage/Bunny/scheduler checks | No | sanitized infrastructure checks | `OpsController` | Secret-free; no provider payloads. |
| GET/POST | `/api/cron/cleanup` | Next route handler | bearer `CRON_SECRET` | cleanup status/results | Secret header | refuses production if secret missing | `app/api/cron/cleanup/route.ts` | Only safe artisan maintenance commands should be added. |
| GET/POST | `/api/cron/worker` | Next route handler | bearer `CRON_SECRET` | one queue worker cycle | Secret header | refuses production if secret missing | `app/api/cron/worker/route.ts` | PM2 worker remains preferred for continuous queues. |

## Admin

Admin routes use `auth:sanctum` and `can:admin`.

| Method | Path | Handler | Request | Response | Checks | Files | Known Issues |
|---|---|---|---|---|---|---|---|
| GET | `/admin/settings` | `AdminController@getSettings` | none | settings map | admin | `AdminController` | Values may need typing. |
| POST | `/admin/settings` | `AdminController@updateSettings` | settings map | success | admin | `AdminController` | Validate allowed keys. |
| GET | `/admin/users` | `AdminController@listUsers` | none | users | admin | `AdminController`, `UserResource` | Pagination needed. |
| POST | `/admin/users` | `AdminController@storeUser` | name,email,password,role,isActive/status,mode, custom limits/pricing/basePriceCents/currency | user and optional userLimit | admin | `AdminController`, `SubscriptionService`, `users-table.tsx` | Store-owner custom limits can be created atomically; employee users are not created here. |
| PUT | `/admin/users/{user}/limits` | `AdminController@updateUserLimits` | limits, pricing, basePriceCents, currency | user limit/pricing payload | admin | `AdminController`, `SubscriptionService`, `UserLimit` | Store-owner accounts only. |
| PATCH | `/admin/users/{user}` | `AdminController@updateUser` | user fields, status or isActive | user | admin | `AdminController` | Password validation can improve. |
| DELETE | `/admin/users/{user}` | `AdminController@deleteUser` | user | success | admin | `AdminController` | Destructive; consider soft delete/audit. |
| GET | `/admin/subscriptions` | `AdminController@listSubscriptions` | none | subscriptions | admin | `AdminController`, `SubscriptionResource` | Pagination needed. |
| POST | `/admin/subscriptions` | `AdminController@storeSubscription` | userId, planId, dates | id | admin | `AdminController` | Clear cache done. |
| PATCH | `/admin/subscriptions/{subscription}` | `AdminController@updateSubscription` | planId/status/endDate | success | admin | `AdminController` | Validate status enum more tightly. |
| GET | `/admin/features` | `AdminController@listFeatures` | none | features | admin | `AdminController` | Needs pagination if large. |
| POST | `/admin/features` | `AdminController@storeFeature` | code/name/type/unit | feature | admin | `AdminController` | Code is public contract. |
| PATCH | `/admin/features/{feature}` | `AdminController@updateFeature` | feature fields | feature | admin | `AdminController` | Changing code can affect gates. |
| GET | `/admin/plans` | `AdminController@listPlans` | none | plans/features | admin | `AdminController` | Plan builder UI partial. |
| POST | `/admin/plans` | `AdminController@storePlan` | plan fields/features | plan | admin | `AdminController` | Archive flow needed. |
| PATCH | `/admin/plans` | `AdminController@updatePlan` | id + plan fields | plan | admin | `AdminController` | Backcompat route. |
| PATCH | `/admin/plans/{plan}` | `AdminController@updatePlanById` | plan fields | plan | admin | `AdminController` | Check frontend binding. |
| PUT | `/admin/plans/{plan}/features` | `AdminController@updatePlanFeatures` | features matrix | plan | admin | `AdminController` | Needs audit logging. |
| GET | `/admin/ops/summary` | `OpsController@summary` | none | queues/storage/notifications/integrations/security/analytics/recentEvents | admin | `OpsController`, `SystemEvent` | Admin operations dashboard data; no secrets. |

## Dashboard And Analytics

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| GET | `/dashboard/init` | `DashboardController@init` | Yes | owner/admin/employee owner scoping | Frontend calls with `storeId: null` to avoid stale selected-store header. Product types/categories are loaded with explicit owner/global scope. Employee payload excludes orders/buyers/subscriptions and is limited to catalog work. Large payload should be split/paginated. |
| GET | `/analytics/dashboard` | `AnalyticsController@dashboard` | Yes | tenant scoped | Supports optional `range` (`7d`, `30d`, `90d`, `year`) and short caching for chart/top-product sections. |
| POST | `/public/analytics/events` | `AnalyticsController@track` | No | public event validation | Tracks visits, product views, checkout starts, campaign opens/clicks. |

Frontend dashboard consumers:

- `lib/data-context.tsx` loads `/dashboard/init` as the bootstrap source for `stores`, `products`, `orders`, `buyers`, `subscriptions`, `productTypes`, `categories`, `employees`, and `settings`.
- `lib/data-context.tsx` calls `/dashboard/init` with `storeId: null`; the main selector validates/persists the current store only after this authenticated payload returns.
- `app/dashboard/page.tsx`, `components/dashboard/stats-cards.tsx`, `components/dashboard/recent-activity.tsx`, and table components consume the unified context directly.
- UX risk: because most dashboard pages depend on one bootstrap payload, a single bootstrap failure can make many sections look missing. Keep `dataError`, page loading states, and stale-store retry behavior visible when refactoring.

## Enterprise Domains

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| GET | `/public/domain/resolve` | `DomainController@resolve` | No | active resolved store | Resolves verified custom domain or subdomain through cache-backed `DomainTenantService`. |
| GET | `/stores/check-domain` | `StoreController@checkDomain` | Yes | reserved values, uniqueness | Returns normalized availability for `subdomain` and `customDomain`. |

Store create/update/settings accept `subdomain`, `customDomain`, and `custom_domain`. Custom domains require the `custom_domain` entitlement. Existing `/public/store/{slug}` remains compatible and also resolves host/subdomain/custom-domain identifiers.

## Customer Notifications

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| POST | `/public/customer-notifications/subscribe` | `CustomerNotificationController@subscribe` | No | active store, phone/channel validation | Stores encrypted/hidden endpoint data and links to global customer by phone. |
| POST | `/public/customer-notifications/unsubscribe` | `CustomerNotificationController@unsubscribe` | No | endpoint or phone required | Marks subscription unsubscribed. |
| POST | `/public/customer-notifications/deliveries/{delivery}/open` | `CustomerNotificationController@markOpened` | No | delivery id | Open tracking. |
| POST | `/public/customer-notifications/deliveries/{delivery}/click` | `CustomerNotificationController@markClicked` | No | delivery id | Click tracking. |
| GET | `/customer-notifications/subscriptions` | `CustomerNotificationController@subscriptions` | Yes | store owner/admin | Device endpoint and key fields are hidden. |
| GET | `/customer-notifications/campaigns` | `CustomerNotificationController@campaigns` | Yes | store owner/admin | Store-scoped campaigns. |
| POST | `/customer-notifications/campaigns` | `CustomerNotificationController@storeCampaign` | Yes | store owner/admin | `status=draft` saves without dispatch; `status=scheduled` queues campaign dispatch. |
| GET | `/customer-notifications/campaigns/{campaign}/deliveries` | `CustomerNotificationController@deliveries` | Yes | store owner/admin | Delivery tracking list. |

## Stores

| Method | Path | Handler | Request | Auth | Checks | Notes |
|---|---|---|---|---|---|---|
| GET | `/stores` | `StoreController@index` | filters/search/limit | Yes | owner/admin | Returns paginated resource collection. |
| POST | `/stores` | `StoreController@store` | StoreRequest | Yes | employees blocked, `stores` limit | Canonical owner input only. |
| GET | `/stores/{store}` | `StoreController@show` | store | Yes | ownership/admin | Loads product count. |
| PATCH/PUT | `/stores/{store}` | `StoreController@update` | StoreRequest | Yes | ownership/admin | Telegram webhook setup if token provided. Branding accepts `logoUrl`/`profilePhotoUrl` and `coverUrl`/`coverPhotoUrl` aliases. |
| DELETE | `/stores/{store}` | `StoreController@destroy` | store | Yes | ownership/admin | Soft delete. |
| POST | `/stores/telegram/validate-bot` | `StoreController@validateTelegramBot` | token | Yes | validation | Do not log token. |
| POST | `/stores/telegram/validate-channel` | `StoreController@validateTelegramChannel` | token, channelId | Yes | validation | Do not log token. |

Frontend consumers:

- `components/dashboard/stores-table.tsx` currently consumes store data from `lib/data-context.tsx` instead of calling `GET /stores` directly.
- `components/dashboard/main-store-selector.tsx` consumes authenticated `accessibleStores` from `lib/data-context.tsx` and does not call a separate select-store API.
- Store create/update/delete mutations are optimistic through `addStore`, `updateStore`, and `deleteStore`; failed mutations roll back local state and show toast errors.
- After `POST /stores` succeeds, `lib/data-context.tsx` persists the returned store id as the selected/current store.
- Store logo/cover uploads use `POST /media` and require an existing authorized store id for non-admin users.
- `PLAN_LIMIT_REACHED` from `POST /stores` must be shown as an upgrade/store-limit prompt, not as a generic failure.

## Tenant Header Validation

- Authenticated dashboard requests may include `X-Store-ID` from the validated selected-store context.
- `TenantMiddleware` resolves the Sanctum bearer token itself because it is global and can run before route auth has populated `request->user()`.
- Valid owned store id: request proceeds and `tenant.id` is set.
- Invalid or cross-owner store id: `403 TENANT_ACCESS_DENIED`.
- Missing/invalid bearer token with `X-Store-ID`: `401 UNAUTHENTICATED_TENANT`.
- Frontend must not treat localStorage as trusted; `DataContext` validates persisted ids against authenticated stores first.

## Products, Categories, Product Types

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| GET/POST/GET/PATCH/DELETE | `/products`, `/products/{product}` | `ProductController` | Yes | tenant/admin, `products` limit on create | Options/variants/media supported, including option `swatches`. Employees can list/create/update owner-store products but cannot delete or Telegram-post products. Product show now validates tenant ownership. |
| POST | `/products/{product}/telegram` | `ProductController@sendToTelegram` | Yes | `telegram_bot` feature, owner/admin only | Posts product to Telegram. Employees denied. |
| API resource | `/categories` | `CategoryController` | Yes | tenant owner/admin; employees inherit owner access for create/update; global rows read-only for non-admin | Canonical name only. `show` is implemented; list includes owner store rows plus global rows for non-admin users. Employees cannot delete categories. |
| API resource | `/product-types` | `ProductTypeController` | Yes | tenant owner/admin; employees inherit owner access for create/update; global rows read-only for non-admin | Canonical name only. `show` is implemented; list includes owner store rows plus global rows for non-admin users. Employees cannot delete product type/category groups. |

## Orders And Buyers

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| GET/POST | `/orders` | `OrderController@index/store` | Yes | tenant owner/admin, buyer blacklist | Employees denied. Authenticated order creation supports idempotency. No SaaS order limits. |
| GET/PATCH/DELETE | `/orders/{order}` | `OrderController@show/update/destroy` | Yes | tenant owner/admin | Employees denied. Missing route methods were added. |
| PATCH | `/orders/{order}/status` | `OrderController@updateStatus` | Yes | tenant owner/admin, status enum | Employees denied. Updates rejected count for returned/problematic. |
| POST | `/orders/{order}/alwaseet` | `OrderController@sendToAlWaseet` | Yes | tenant owner/admin, `alwaseet_integration`, confirmed status | Employees denied. Dispatches job. |
| GET/POST/GET | `/buyers`, `/buyers/{buyer}` | `BuyerController` | Yes | tenant-owned buyers, owner/admin only | Employees denied. Owner lookup uses tenant owner id. Buyer create sets `user_id` to the tenant owner and validates phone uniqueness only within that owner. |
| PATCH | `/buyers/{buyer}` | `BuyerController@update` | Yes | tenant-owned buyer, owner/admin only | Updates name, phone, email, notes, address, and risk. |
| POST/DELETE | `/buyers/{buyer}/blacklist` | `BuyerController@blacklist/unblacklist` | Yes | tenant-owned buyer, owner/admin only | Sets/removes blacklist state and reason. |

## Media

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| GET | `/media` | `MediaController@index` | Yes | tenant/admin | Optional store_id/product_id filters. |
| POST | `/media` | `MediaController@store` | Yes | common image/video MIME allowlist, authorized `storeId`, optional `productId` ownership, `storage_gb` quota | Accepts multipart `file`, `storeId`, optional `productId`; max Laravel validation is 50MB. Local backup is written first; Bunny URL/provider is used only after successful Bunny upload. |
| DELETE | `/media/{media}` | `MediaController@destroy` | Yes | media store ownership/admin | Soft deletes media, removes local backup, and queues Bunny remote cleanup for Bunny-backed files. |
| POST | `/media/{media}/replace` | `MediaController@replace` | Yes | media store ownership/admin, `storage_gb` quota | Replaces file using the existing local/Bunny upload strategy and queues cleanup for the old Bunny object when applicable. |

## Employees

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| GET | `/employees` | `EmployeeController@index` | Yes | tenant store owner | Employees list owner employees. Platform admins manage tenant owners from `/admin/users`, not staff accounts. |
| POST | `/employees` | `EmployeeController@store` | Yes | owner only, `employees` limit | Employee role created with parent_id. |
| PATCH | `/employees/{employee}` | `EmployeeController@update` | Yes | owner only, parent_id check | Password changes and inactive status revoke employee tokens. |
| DELETE | `/employees/{employee}` | `EmployeeController@destroy` | Yes | owner only, parent_id check | |

## Telegram

| Method | Path | Handler | Auth | Checks | Notes |
|---|---|---|---|---|---|
| POST | `/telegram/webhook` | `TelegramController@handleWebhook` | No | `X-Telegram-Bot-Api-Secret-Token` when `TELEGRAM_WEBHOOK_SECRET` is configured | Public Telegram webhook. Rejects invalid secret headers when configured; remains compatible in environments without the secret but logs a warning. |
| POST | `/telegram/link-bot` | `TelegramController@linkBot` | Yes | auth | Should gate feature. |
| POST | `/telegram/setup-webhook` | `TelegramController@setupWebhook` | Yes | `can:admin` | Admin-only. Does not expose bot token or raw Telegram payload. |
| GET/PATCH/POST | `/stores/{store}/telegram-settings`, `/stores/{store}/telegram-settings/test` | `StoreController` | Yes | owner/admin; no bot token accepted | Store owner can set chat/channel/thread/auto-post flags and send a central-token test notification. |

Flutter Dashboard Telegram notes:

- `TelegramService` uses the platform-managed `TELEGRAM_BOT_TOKEN`; store owners must not be shown a bot-token field.
- `POST /telegram/setup-webhook` is admin-gated and includes `TELEGRAM_WEBHOOK_SECRET` in Telegram `setWebhook` when configured.
- `POST /telegram/link-bot` should be gated by `telegram_bot` before Flutter treats it as production-ready.
- Store Telegram settings/test APIs are available through `StoreController` and never accept or return bot tokens.

## Flutter Dashboard API Gaps

Discovered during the 2026-05-10 Flutter dashboard audit:

- Implemented 2026-05-10: `PATCH /stores/{store}/status`.
- Implemented 2026-05-10: `GET/PATCH /stores/{store}/settings`.
- Implemented 2026-05-10: `GET/PATCH/POST /stores/{store}/telegram-settings[/test]`.
- Implemented 2026-05-10: notification polling/read APIs under `/notifications`.
- Implemented 2026-05-10: private broadcast auth for `store.{id}` / client `private-store.{id}`.
- Implemented 2026-05-10: `GET/POST/DELETE /device-tokens` for Flutter token storage.
- Implemented 2026-05-11 from `.ai2`: queued push sender/worker for registered web/android FCM and iOS APNs device tokens. Required env/config names are `PUSH_FCM_PROJECT_ID` or `FIREBASE_PROJECT_ID`, `PUSH_FCM_SERVICE_ACCOUNT_PATH` or `FIREBASE_CREDENTIALS`, optional `PUSH_FCM_SERVICE_ACCOUNT_JSON`, and APNs `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY_PATH` or `APNS_PRIVATE_KEY`, `APNS_ENV`.
- Implemented 2026-05-10: buyer update/blacklist APIs.
- Implemented 2026-05-10: `/billing/current` custom `limits`, `usage`, and `pricing` payloads without order limits.
- Implemented 2026-05-10: admin-only `POST /admin/broadcast`.
- Implemented 2026-05-10: media delete/replace APIs.
- Implemented 2026-05-10: safe `GET /docs`.
- Fixed 2026-05-10: `POST /telegram/setup-webhook` is admin-gated and no longer returns raw Telegram response data.
- Fixed 2026-05-11 from `.ai2`: storefront `/buyers/auth` call was removed; public checkout remains guest-first. No buyer-auth API is exposed.
- Admin API keys page is local-only; backend API-key endpoints are missing.

## Al-Waseet

Routes under `/alwaseet/*` use `plan.restricted`; most nested routes also use `alwaseet.configured`.

- Settings: `GET/PUT /alwaseet/settings`, `POST /alwaseet/settings/test`
- Reference data: `GET /cities`, `/regions`, `/package-sizes`, `/order-statuses`
- Orders: `GET/POST /orders`, `POST /orders/batch`, `PUT /orders/{qrId}`
- Invoices: `GET /invoices`, `GET /invoices/{invoiceId}/orders`, `POST /invoices/{invoiceId}/receive`

Known issues: tests currently fail because SQLite PDO is unavailable in the environment, not because route definitions are missing.
