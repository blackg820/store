# Flutter Dashboard API Audit

Last updated: 2026-05-11

Purpose: document the real backend/API/frontend contract for a future separate Flutter Dashboard app. This is documentation only. No Flutter app, backend logic, or current frontend behavior was changed during this audit.

## Flutter Dashboard Implementation Status 2026-05-11

A separate Flutter Dashboard client now exists in this Flutter project under `lib/`. It does not replace the Laravel backend or public storefront.

Implemented client capabilities:

- App shell, responsive sidebar/mobile navigation, guarded `go_router` routing, Material theme, and shared loading/empty/error/confirm states.
- English, Arabic, and Kurdish localization with RTL for Arabic/Kurdish.
- Production API base URL fixed to `https://store.blackt.uk/api/v1/`, so login uses `https://store.blackt.uk/api/v1/auth/login` in debug and release builds.
- Normalized API client for `{ success, data, message }`, bare resource collections, wrapped paginated collections, and Laravel error envelopes.
- Bearer auth, token refresh through `/auth/refresh`, `Accept-Language`, multipart upload, `PUT/PATCH/DELETE`, and validated `X-Store-ID` injection.
- Secure token storage through `flutter_secure_storage`; web storage residual risk is documented in login UI.
- Auth login/logout/bootstrap, `/auth/user`, profile update, password update with local logout after session revocation.
- Store selector validation from `/dashboard/init`, persisted selected store only after validation, owner/employee auto-select, admin all-store context, and selected-store clearing on tenant errors.
- Dashboard home metrics; store CRUD/status/settings/branding/social update; media upload/delete/replace; product list/create/edit/delete/detail/active toggle/options/variants JSON/Telegram post; product types/categories create/edit/delete with global rows read-only; orders create/list/detail/edit/status update/delete; buyer create/detail/edit/blacklist; Telegram settings/link/channel validation; notification polling/read and device-token registration/deletion; billing current/usage/calculate; admin users create/edit, plans/features/subscriptions/settings/broadcast, and user limit editor.

Checks run after implementation:

- `flutter analyze`
- `flutter test`
- `flutter build web`

Runtime/API smoke tests against a real Laravel instance were not executed because no safe test credentials were provided.

Runtime notes from `.ai2` backend update:

- Device token registration/deletion is wired in Flutter; queued push delivery exists in the backend according to `.ai2`, but actual delivery requires FCM/APNs provider env/config and queue workers.
- `/buyers/auth` is intentionally unsupported and no longer referenced by the storefront cart drawer according to `.ai2`; checkout remains guest-first.
- Telegram webhook secret validation exists when `TELEGRAM_WEBHOOK_SECRET` is configured; every public environment must set it and rerun admin webhook setup.
- Bunny remote cleanup is queued for deleted/replaced Bunny-backed media; queue workers must run the `media` queue.

Implementation update on 2026-05-10: missing backend APIs required for Flutter Dashboard readiness were added after this audit. Added endpoints include store status/settings, Telegram settings/test, notifications polling/read state, device tokens, buyer update/blacklist, media delete/replace, `/billing/current` custom limits payloads, admin broadcast, and safe `/api/v1/docs`. Realtime `private-store.{id}` authorization and admin-only Telegram webhook setup were also fixed. `/buyers/auth` was later formally removed from storefront usage in favor of guest-first checkout.

Implementation update from `.ai2` on 2026-05-11: queued push delivery was added for registered web/android FCM and iOS APNs device tokens, Telegram webhook handling now verifies `X-Telegram-Bot-Api-Secret-Token` when `TELEGRAM_WEBHOOK_SECRET` is configured, Bunny media delete/replace now queues remote cleanup, and the storefront `/buyers/auth` reference was formally removed in favor of guest-first checkout. No new DB migration was added.

## Executive Summary

- Backend: Laravel 13 API under `/api/v1`, PHP 8.3+, Sanctum token authentication, global `TenantMiddleware`, Laravel resources, service-layer subscription logic.
- Frontend: Next.js 16 App Router dashboard/storefront with React 19, TypeScript, Tailwind CSS 4, Radix UI, lucide-react, Recharts, Sonner.
- API proxy: Next route `app/api/v1/[...path]/route.ts` proxies `/api/v1/*` to Laravel via `INTERNAL_API_URL` or localhost fallback.
- Auth: Sanctum access token plus rotating refresh token stored in browser localStorage by the current web app. Flutter must implement safer platform storage.
- Tenancy: selected store is not persisted server-side. The frontend stores `storify_selected_store_id` locally and sends `X-Store-ID` only after auth/store validation. Backend validates ownership in `TenantMiddleware`.
- Roles: `admin`, `store_owner`, `employee`. Employees inherit owner tenant via `parent_id` and are limited to products/product types/categories in the dashboard.
- Business rules verified:
  - Store owners can have multiple stores.
  - Store owners use one main Store Selector after authentication.
  - Backend validates `X-Store-ID` ownership.
  - Orders have no SaaS order limits.
  - Store owners should not set Telegram bot token; current service uses platform-managed env token.
  - Store owner store profile/branding/social settings are per selected store.
  - SaaS admin manages custom limits/pricing through admin endpoints.

## Important Response Shape Notes

The backend is not fully consistent.

- Controllers using `ApiResponse::success()` generally return:

```json
{ "success": true, "message": "optional", "data": {} }
```

- `ApiResponse::error()` generally returns:

```json
{ "success": false, "code": "OPTIONAL_CODE", "message": "...", "errors": {} }
```

- Limit errors return:

```json
{ "success": false, "code": "PLAN_LIMIT_REACHED", "message": "...", "details": {}, "upgrade": {} }
```

- Some resource controllers return bare Laravel resources:

```json
{ "data": [ /* rows */ ] }
```

- Paginated resource collections wrapped inside `success()` may serialize as:

```json
{
  "success": true,
  "message": null,
  "data": {
    "data": [ /* rows */ ],
    "links": {},
    "meta": {}
  }
}
```

Flutter must normalize all of these response styles in one API layer.

## Architecture Audit

### Backend Stack

- Framework/language: Laravel 13, PHP 8.3+, Sanctum, Reverb package installed, minishlink web-push installed.
- Routes: `backend/routes/api.php`, versioned under `/api/v1`.
- Controllers:
  - Auth closures in `routes/api.php`
  - `DashboardController`
  - `StoreController`
  - `ProductController`
  - `ProductTypeController`
  - `CategoryController`
  - `OrderController`
  - `BuyerController`
  - `MediaController`
  - `BillingController`
  - `AdminController`
  - `ProfileController`
  - `EmployeeController`
  - `TelegramController`
  - `PushSubscriptionController`
  - `AlWaseetController`
- Services: `SubscriptionService`, `TelegramService`, `NotificationService`, `AlWaseetManager`, `AlWaseetService`.
- Middleware:
  - `TenantMiddleware` is global and validates `X-Store-ID` using bearer token resolution.
  - `EnsureUserHasPlan` is route alias `plan.restricted`.
  - `EnsureStoreHasAlWaseet` is route alias `alwaseet.configured`.
- Auth: Sanctum bearer access token with rotating refresh token. Access tokens expire after 12 hours; refresh tokens after 30 days.
- Permission system:
  - `can:admin` gate checks `$user->role === 'admin'`.
  - Controller-level role checks for owner/employee/admin.
  - Employees inherit owner tenant via `parent_id`.
- Tenant/store isolation:
  - Store header: `X-Store-ID`.
  - Public store header/query: `X-Store-Slug` or URL slug where supported.
  - `TenantMiddleware` rejects cross-owner store headers with `TENANT_ACCESS_DENIED`.
  - `HasTenant`, `UserOwned`, and controller checks also scope models.

### Frontend Stack

- Current dashboard: `app/dashboard/*`, `components/dashboard/*`, `lib/data-context.tsx`.
- Current storefront: `app/store/[slug]/*`, `components/store/*`.
- Design system: `DESIGN.md` is primary UI reference. Public storefront remains light-first unless explicitly requested otherwise.
- UI stack: React, TypeScript, Tailwind, Radix UI, lucide-react, Recharts, Sonner.
- API client: `lib/api-client.ts`.
  - Adds `Authorization: Bearer ...`.
  - Adds `X-Store-ID` only when token and selected store exist.
  - Refreshes tokens single-flight on 401.
  - Clears stale selected store on tenant denial for safe GET retry.
- Current i18n: `react-i18next`, locale files at `locales/en/common.json`, `locales/ar/common.json`, `locales/ku/common.json`.
- Current Store Selector:
  - `components/dashboard/main-store-selector.tsx`.
  - Uses `DataContext.accessibleStores`.
  - Admin can clear selection for all-store context.
  - Owners/employees auto-select first active accessible store.

### Database Summary

Important tables:

- `users`: admins, store owners, employees. Important columns: `id`, `parent_id`, `name`, `email`, `password`, `role`, `mode`, `subscription_plan`, `status`.
- `stores`: owned by users. Important columns: `user_id`, `name`, `slug`, `whatsapp_number`, `description`, `bio`, `default_language`, `status`, `base_currency`, `base_language`, `delivery_time`, `theme_settings`, `option_presets`, `notification_settings`, `logo_url`, `cover_url`, social URL columns, Telegram ids, `telegram_token`, Al-Waseet encrypted credential fields.
- `product_types`: global or store-scoped catalog type rows.
- `categories`: global or store-scoped category rows with optional parent and product type.
- `products`: store-scoped products with type/category, title, description, price, discount, media/options/variants.
- `product_options`: per-product option definitions with `values_json`, `swatches_json`.
- `product_variants`: per-product SKU/price/stock combinations with `option_values`.
- `media`: store/product media rows with URL, file path/size/type/provider/visibility.
- `buyers`: tenant-owner scoped customers. Unique `(user_id, phone)`.
- `orders`: store/buyer orders with status, totals, customer/logistics fields.
- `order_items`: order lines. No `variant_id` column yet; selected options are stored as JSON.
- `plans`, `features`, `plan_features`, `subscriptions`, `subscription_usages`, `usage_records`, `usage_rollups`, `user_limits`.
- `push_subscriptions`: web push subscription storage.
- `global_settings`: platform site settings.
- `audit_logs`: table exists; API exposure is via dashboard init only.

## API Groups

Base path for Flutter: `/api/v1`.

### 1. Auth

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | route closure | No | `email`, `password` | `data.accessToken`, `data.refreshToken`, `data.user` with id/name/email/role/mode/parentId/subscriptionPlan | Ready |
| POST | `/auth/refresh` | route closure | No | `refreshToken` | new `accessToken`, `refreshToken`; old refresh token deleted | Ready |
| GET | `/auth/user` | route closure | Yes | none | `UserResource` | Ready, but `userLimit` only appears if relation loaded |
| POST | `/auth/logout` | route closure | Yes | optional `refreshToken` | success message | Ready |
| POST | `/auth/logout-all` | route closure | Yes | none | success message | Ready |
| PATCH | `/profile` | `ProfileController@update` | Yes | `name`, `email` | raw user object | Ready, inconsistent response shape |
| PATCH | `/profile/password` | `ProfileController@updatePassword` | Yes | `currentPassword`, `newPassword` | `SESSION_REVOKED`; all tokens deleted | Ready; Flutter must force re-login |

Validation/errors:

- Login: invalid credentials 401, inactive/suspended `ACCOUNT_INACTIVE` 403.
- Refresh: invalid/expired refresh 401, inactive account 403 and tokens revoked.
- Password: wrong current password 422.

### 2. Stores And Store Selector

| Method | Path | Handler | Auth | Body/Params | Response | Tenant/ownership | Flutter status |
|---|---|---|---|---|---|---|---|
| GET | `/stores` | `StoreController@index` | Yes | query: `search`, `limit` | paginated `StoreResource` | Admin all; non-admin owner stores | Ready |
| POST | `/stores` | `StoreController@store` | Yes | `StoreRequest` fields | `StoreResource`, 201 | Employees blocked; `stores` limit checked | Ready |
| GET | `/stores/{store}` | `StoreController@show` | Yes | path store id | `StoreResource` | Admin or tenant owner | Ready |
| PATCH/PUT | `/stores/{store}` | `StoreController@update` | Yes | `StoreRequest` fields | `StoreResource` | Admin or tenant owner; employees blocked | Partially ready |
| DELETE | `/stores/{store}` | `StoreController@destroy` | Yes | path store id | success | Admin or tenant owner; employees blocked | Ready, destructive |

StoreRequest fields:

- Required: `name`, `slug`.
- Optional: `whatsappNumber`, `deliveryDays`, `description`, `logoUrl`, `profilePhotoUrl`, `coverUrl`, `coverPhotoUrl`, `facebookUrl`, `instagramUrl`, `tiktokUrl`, `youtubeUrl`, `twitterUrl`, `telegramUrl`, `snapchatUrl`, `websiteUrl`, `telegramChatId`, `telegramGroupId`, `telegramUserId`, `telegramChannelId`, `notificationSettings`.

StoreResource fields:

- `id`, `userId`, `name`, `slug`, `currency`, `whatsappNumber`, `description`, `logoUrl`, `coverUrl`, social URLs, `deliveryDays`, `telegramChatId`, `telegramUserId`, `telegramGroupId`, `themeSettings`, `notificationSettings`, `optionPresets`, `isActive`, `productCount`, `storageUsage`, `createdAt`.

Gaps/inconsistencies:

- No server-side "current selected store" endpoint. Flutter should keep local selected store after validating owned stores.
- `defaultLanguage` is used by UI but not accepted by `StoreRequest` or returned by `StoreResource`.
- `bio` column exists but is not accepted/returned.
- `status`/open-closed update is missing from `StoreRequest` and update mapping.
- `telegramChannelId` is accepted in request/update but not returned by `StoreResource`.
- `telegramAutoPost` is used by UI/model but not accepted/returned by `StoreRequest`/`StoreResource`.
- Store update requires `name` and `slug`, so partial settings PATCH is not actually partial.

Store Selector rule for Flutter:

- After login, load `/dashboard/init` or `/stores`.
- Build accessible store list from server response only.
- Persist selected store id locally only after it exists in accessible list.
- Send `X-Store-ID` for store-scoped dashboard requests.
- Clear local selected store if backend returns `TENANT_ACCESS_DENIED` or `UNAUTHENTICATED_TENANT`.
- After `POST /stores`, auto-select the returned store id.

### 3. Store Settings, Profile, Branding, Social

Ready APIs:

- `PATCH /stores/{store}` updates name, slug, WhatsApp, description, logo/cover URLs, social URLs, Telegram ids, notification settings.
- `POST /media` uploads logo/cover files after a real authorized `storeId` exists.

Not ready or incomplete:

- Open/closed status update API is missing.
- Store default language update is missing.
- Store `bio` update/response is missing despite DB column.
- Store branding/theme schema validation is loose.
- Dedicated "store profile/settings" endpoints do not exist; use store update for now.
- Store owner cannot set Telegram bot token; this is correct. Do not add bot token to Flutter forms.

### 4. Products

| Method | Path | Handler | Auth | Body/Params | Response | Tenant/ownership | Flutter status |
|---|---|---|---|---|---|---|---|
| GET | `/products` | `ProductController@index` | Yes | `store_id`, `category_id`, `product_type_id`, `search`, `min_price`, `max_price`, `limit` | paginated `ProductResource` | Admin all; non-admin owner stores | Ready, but may N+1 options/variants |
| POST | `/products` | `ProductController@store` | Yes | `ProductRequest` plus optional extra product fields | `ProductResource`, 201 | Store ownership; `products` limit | Ready |
| GET | `/products/{product}` | `ProductController@show` | Yes | path id | `ProductResource` | Admin or owner/employee tenant | Ready |
| PATCH | `/products/{product}` | `ProductController@update` | Yes | same required shape as create | `ProductResource` | Admin or owner/employee tenant | Ready with caveat: update is not partial |
| DELETE | `/products/{product}` | `ProductController@destroy` | Yes | path id | success | Employees denied | Ready |
| POST | `/products/{product}/telegram` | `ProductController@sendToTelegram` | Yes | none | success | Employees denied; `telegram_bot` feature | Ready if store has channel and feature |

ProductRequest validation:

- Required: `storeId`, `title`, `price`, `productTypeId`.
- Optional: `categoryId`, `sku`, `description`, `options`, `variants`, `media`.
- Controller also reads optional `costPrice`, `discount`, `deliveryFee`, `needsDeposit`, `depositAmount`, `customData`, `isActive`, but these are not listed in `ProductRequest` validation.

ProductResource fields:

- `id`, `storeId`, `productTypeId`, `categoryId`, category/type names and slugs, `sku`, `title`, `description`, `price`, `costPrice`, `discount`, `deliveryFee`, `needsDeposit`, `depositAmount`, `isActive`, `createdAt`, `updatedAt`, `customData`, `media`, `options`, `variants`, `store`, `imageUrl`.

Options/variants:

- Options are embedded in create/update payloads: `name`, `type`, `values`, optional `swatches`.
- Variants are embedded: `title`, `sku`, `priceOverride`, `stockQuantity`, `optionValues`, `imageId`, `isActive`.

Caveats:

- Product update requires create-like required fields (`storeId`, `title`, `price`, `productTypeId`).
- Product media is attached by passing `media: [{ id, isMain }]`.
- No dedicated archive endpoint; delete is soft delete. Product active/inactive is via `PATCH /products/{id}` with `isActive`.

### 5. Categories And Product Types

Categories:

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| GET | `/categories` | `CategoryController@index` | Yes | optional `store_id` | bare `CategoryResource` collection | Ready |
| POST | `/categories` | `CategoryController@store` | Yes | `storeId`, `productTypeId`, `parentId`, `name`, optional `slug` | `CategoryResource` | Ready |
| GET | `/categories/{category}` | `CategoryController@show` | Yes | id | `CategoryResource` | Ready |
| PATCH/PUT | `/categories/{category}` | `CategoryController@update` | Yes | partial `productTypeId`, `parentId`, `name`, `slug`, `isActive` | `CategoryResource` | Ready |
| DELETE | `/categories/{category}` | `CategoryController@destroy` | Yes | id | success | Ready, employees denied |

Product types:

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| GET | `/product-types` | `ProductTypeController@index` | Yes | optional `store_id` | bare `ProductTypeResource` collection | Ready |
| POST | `/product-types` | `ProductTypeController@store` | Yes | `storeId`, `name`, optional `slug`, `customFields` | `ProductTypeResource` | Ready |
| GET | `/product-types/{product_type}` | `ProductTypeController@show` | Yes | id | `ProductTypeResource` | Ready |
| PATCH/PUT | `/product-types/{product_type}` | `ProductTypeController@update` | Yes | partial `name`, `slug`, `customFields`, `isActive` | `ProductTypeResource` | Ready |
| DELETE | `/product-types/{product_type}` | `ProductTypeController@destroy` | Yes | id | success | Ready, employees denied |

Rules:

- Non-admin users can read global rows (`store_id = null`) and own-store rows.
- Non-admin users must provide `storeId` for create.
- Non-admin users cannot mutate global rows.
- Employees can create/update owner-store catalog rows but cannot delete.
- Product/category mapping is through `Product.categoryId` and `Product.productTypeId`; no separate mapping endpoint.

### 6. Orders And Customers

Orders:

| Method | Path | Handler | Auth | Body/Params | Response | Tenant/ownership | Flutter status |
|---|---|---|---|---|---|---|---|
| GET | `/orders` | `OrderController@index` | Yes | `store_id`, `status`, `buyer_id`, `start_date`, `end_date`, `limit` | paginated `OrderResource` | Admin or owner; employees denied | Ready |
| POST | `/orders` | `OrderController@store` | Yes | `OrderRequest` | `OrderResource`, 201 | Admin or owner; employees denied | Partially ready |
| GET | `/orders/{order}` | `OrderController@show` | Yes | id | `OrderResource` | Admin or owner | Ready |
| PATCH | `/orders/{order}` | `OrderController@update` | Yes | partial status/notes/customer/logistics/totals | `OrderResource` | Admin or owner | Ready |
| PATCH | `/orders/{order}/status` | `OrderController@updateStatus` | Yes | `status` | `OrderResource` | Admin or owner | Ready |
| DELETE | `/orders/{order}` | `OrderController@destroy` | Yes | id | success | Admin or owner | Ready |
| POST | `/orders/{order}/alwaseet` | `OrderController@sendToAlWaseet` | Yes | none | `OrderResource` | Admin or owner, feature, confirmed status | Optional |

OrderRequest:

- Required: `storeId`, `buyerId`.
- Optional: `customerName`, `customerPhone`, `cityId`, `regionId`, `packageSizeId`, `itemsDescription`, `addressDetails`, `orderNotes`, `codAmount`, `clientReferenceId`, `productId`, `quantity`.

Status enum:

- `pending`, `confirmed`, `delivered`, `returned`, `problematic`.

Important:

- No SaaS order limits are enforced.
- Authenticated order creation only supports a single `productId`/`quantity` shape in practice.
- Public checkout supports `items[]` and server-calculated totals and should remain the storefront order flow.
- `order_items` does not persist `variant_id`; only `options` JSON.

Customers/buyers:

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| GET | `/buyers` | `BuyerController@index` | Yes | `phone`, `risk_level`, `blacklisted`, `limit` | bare paginated `BuyerResource` collection | Ready |
| POST | `/buyers` | `BuyerController@store` | Yes | `phone`, `name`, optional `userId`, address fields | `BuyerResource` | Ready |
| GET | `/buyers/{buyer}` | `BuyerController@show` | Yes | id | `BuyerResource` | Ready |

Customer gaps:

- No buyer update endpoint.
- No buyer blacklist/unblacklist endpoint.
- Current frontend blacklist action is local-only.
- `/buyers/auth` is called by storefront cart drawer but no backend route exists. This is storefront related, not required for Flutter dashboard unless buyer login is desired.

### 7. Dashboard Stats And Analytics

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| GET | `/dashboard/init` | `DashboardController@init` | Yes | none | user, stores, products, orders, buyers, productTypes, categories, settings, users, auditLogs, subscriptions | Ready for bootstrap, not scalable |
| GET | `/analytics/dashboard` | `AnalyticsController@dashboard` | Yes | optional `store_id` | metrics, revenueChart, topProducts | Partially ready |

Dashboard init behavior:

- Admin gets global data plus users/auditLogs/subscriptions.
- Store owner gets owner stores/products/orders/buyers/subscriptions.
- Employee gets stores/products/catalog only; orders and buyers empty.
- Data is capped at 100 rows for several collections and not fully paginated.

Analytics caveats:

- Current web analytics page calculates mostly client-side from `/dashboard/init`.
- `AnalyticsController@dashboard` uses `$user->id` instead of tenant owner id for non-admins, so employee/parent-owner edge cases are risky.
- `conversionRate` is mocked as `3.5`.

### 8. Telegram

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| POST | `/telegram/webhook` | `TelegramController@handleWebhook` | No | Telegram update payload | `{ "status": "ok" }` | Backend integration only |
| POST | `/telegram/link-bot` | `TelegramController@linkBot` | Yes | `storeId`, `type` in `user,group,channel` | `deeplink`, `botUsername` | Ready with caveats |
| POST | `/telegram/setup-webhook` | `TelegramController@setupWebhook` | Yes | none | Telegram API result | Unsafe: should be admin-only |
| POST | `/stores/telegram/validate-bot` | `StoreController@validateTelegramBot` | Yes | none | `{ valid }` | Ready but route name misleading |
| POST | `/stores/telegram/validate-channel` | `StoreController@validateTelegramChannel` | Yes | `channelId` | Telegram channel validation result | Ready with caveats |
| POST | `/products/{product}/telegram` | `ProductController@sendToTelegram` | Yes | none | success/error | Ready if feature and channel configured |

Verified rules:

- `TelegramService::getToken()` uses platform-managed `TELEGRAM_BOT_TOKEN`.
- Store owners do not need and should not see a bot token field.
- Store update can save chat/user/group/channel ids and notification settings.
- `NotificationService` sends order notifications to user/group/chat/channel ids based on `notification_settings`.

Telegram gaps/caveats:

- `linkBot` does not currently gate `telegram_bot` feature.
- `setupWebhook` is available to any authenticated role; should be admin-only before Flutter exposes it.
- `validate-channel` does not accept/validate store ownership or selected store context.
- No `GET /stores/{id}/telegram-settings` endpoint; use `StoreResource`, but `telegramChannelId` is not returned today.
- No test notification endpoint.
- No message thread/topic id field/API.
- `telegramAutoPost` appears in frontend types/UI but is not returned by `StoreResource` and not validated by `StoreRequest`.
- Old `telegram_token` column/fillable exists, but central service ignores it. Flutter must not expose token input.

### 9. Notifications And Realtime

Existing pieces:

- `OrderCreated` implements `ShouldBroadcast` and broadcasts `order.created` on `PrivateChannel('store.' . store_id)`.
- `routes/channels.php` only authorizes `App.Models.User.{id}`.
- `PushSubscriptionController` exposes web push subscribe/unsubscribe.
- Current dashboard topbar uses pending orders from loaded order data; it does not use realtime API.
- `public/sw.js` implements basic caching only; no push event listener.

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| POST | `/push/subscribe` | `PushSubscriptionController@subscribe` | Yes | `endpoint`, `publicKey`, `authToken` | success | Web push only, not Flutter FCM |
| POST | `/push/unsubscribe` | `PushSubscriptionController@unsubscribe` | Yes | `endpoint` | success | Web push only |

Gaps:

- No notification list/polling endpoint.
- No read/unread notification model/API.
- No FCM/APNs device token registration endpoint.
- Realtime private channel authorization for `store.{id}` is missing.
- Broadcast connection defaults to `null` unless configured; runtime status is UNKNOWN because `.env` was not read.

Flutter recommendation:

- Do not force FCM in Phase 1.
- Implement polling from `/orders?status=pending&store_id=...` as fallback.
- Prepare an abstraction for realtime/push, but mark FCM token registration as backend prerequisite.

### 10. Custom Limits And Pricing

Customer/owner billing:

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| POST | `/billing/calculate` | `BillingController@calculate` | No | custom `limits`, `pricing`, `basePriceCents`, `currency` or legacy `planId`, `quantities` | invoice simulation | Ready but public; rate limiting recommended |
| GET | `/billing/current` | `BillingController@current` | Yes | none | subscription, live usage, unlimited | Ready, but missing custom userLimit payload |
| GET | `/billing/usage` | `BillingController@usage` | Yes | none | live usage: storage/stores/employees/products | Ready |
| POST | `/billing/checkout-session` | `BillingController@checkoutSession` | Yes | `planId` | provider redirect or manual approval handoff | Ready |

Admin limits/pricing:

| Method | Path | Handler | Auth | Body/Params | Response | Flutter status |
|---|---|---|---|---|---|---|
| GET | `/admin/users` | `AdminController@listUsers` | Admin | none | users with `userLimit` | Ready, no pagination |
| POST | `/admin/users` | `AdminController@storeUser` | Admin | name/email/password/role/status/mode, optional plan or custom limits/pricing | user | Ready |
| PATCH | `/admin/users/{user}` | `AdminController@updateUser` | Admin | name/email/role/status/isActive/password | user | Ready |
| PUT | `/admin/users/{user}/limits` | `AdminController@updateUserLimits` | Admin | `limits`, `pricing`, optional base/currency | limit/pricing payload | Ready |
| DELETE | `/admin/users/{user}` | `AdminController@deleteUser` | Admin | id | success | Ready, destructive |
| GET/POST/PATCH | `/admin/features` | `AdminController` | Admin | feature fields | feature payloads | Ready, canonical code risk |
| GET/POST/PATCH/PUT | `/admin/plans*` | `AdminController` | Admin | plan/feature matrix | plan payloads | Ready |
| GET/POST/PATCH | `/admin/subscriptions*` | `AdminController` | Admin | subscription fields | subscription payloads | Ready |

Canonical custom limit keys:

- Limits: `max_stores`, `max_products`, `max_employees`, `storage_gb`, `api_requests`, `telegram_bots`, `integrations_count`, `custom_domains`.
- Pricing: `price_per_store`, `price_per_product`, `price_per_employee`, `price_per_storage_gb`, `price_per_telegram_bot`, `price_per_integration`, `price_per_custom_domain`.

Important:

- Orders are intentionally absent from custom limits.
- Store owners cannot edit their own limits/pricing.
- Store-owner read view for custom limits is incomplete because `/billing/current` returns usage/subscription but not `userLimit`.

### 11. Uploads And Media

| Method | Path | Handler | Auth | Body/Params | Response | Tenant/ownership | Flutter status |
|---|---|---|---|---|---|---|---|
| GET | `/media` | `MediaController@index` | Yes | `store_id`, `product_id` | media list | Admin or owner stores | Ready |
| POST | `/media` | `MediaController@store` | Yes | multipart `file`, `storeId`, optional `productId` | media id/url/type | Store ownership, product ownership, `storage_gb` limit | Ready |

Upload validation:

- Max: 50 MB (`max:51200`).
- MIME allowlist: JPEG/PNG/WebP/GIF/HEIC/HEIF/MP4/WebM/MOV/AVI.

Gaps:

- No media delete endpoint.
- No replace endpoint.
- Non-admin cannot upload with `storeId=0`; current store creation UI can hit this when uploading before store creation.
- No direct signed upload endpoint.

### 12. Translations And i18n

Current web:

- `locales/en/common.json`
- `locales/ar/common.json`
- `locales/ku/common.json`
- `lib/i18n.ts` loads namespaces through `react-i18next`.
- `lib/types.ts` also imports common JSON directly into a simple `translations` object.
- Direction: Arabic and Kurdish are RTL, English LTR.

Flutter should:

- Use `flutter_localizations` plus ARB/JSON generated localization.
- Support English, Arabic, Kurdish if all are kept.
- Use canonical merchant content fields only. Do not create `name_ar`, `title_ku`, etc.
- Keep all visible strings in localization files.

## APIs Ready For Flutter

- Auth login/refresh/me/logout/logout-all.
- Profile update/password change.
- Store list/create/details/update/delete with caveats.
- Product list/create/details/update/delete.
- Product options/variants embedded in product payloads.
- Category and product type CRUD.
- Order list/details/update/status/delete.
- Buyer list/create/details/update/blacklist.
- Dashboard bootstrap.
- Billing current/usage/calculate/checkout.
- Admin users/limits/plans/features/subscriptions.
- Media list/upload/delete/replace.
- Telegram link-bot, validate channel, product post with caveats.

## Unsafe Or Incomplete APIs For Flutter

- Push delivery is runtime-configured: provider env/config and queue workers are required for actual delivery.
- `GET /analytics/dashboard`: tenant owner edge cases and mocked conversion rate.
- `GET/PUT /alwaseet/settings`: uses `$request->user()->store`, which is `hasOne` and does not support multi-store selected store correctly.
- Al-Waseet frontend calls omit bearer auth in current web components; Flutter should use authenticated API client if implementing Al-Waseet.
- Realtime `store.{id}` broadcast channel authorization exists according to the 2026-05-10 backend update; runtime broadcast provider config remains environment-dependent.
- Store update is not truly partial and misses status/defaultLanguage/bio/telegramChannelId response/telegramAutoPost.
- Admin list endpoints are not paginated.
- `/billing/calculate` is public and should be rate-limited.

## Historical Missing APIs From Initial Audit

The list below is preserved as historical audit context. The 2026-05-10 and `.ai2` 2026-05-11 implementation notes above supersede several items: store status/settings, notifications, device tokens, realtime auth, buyer update/blacklist, media delete/replace, billing current custom limits, admin broadcast, Telegram setup admin gating, queued push delivery, Bunny remote cleanup queueing, Telegram webhook secret validation, and `/buyers/auth` removal have been added or formally scoped.

Priority labels: Critical, High, Medium, Low.

### Critical

1. Store status/open-closed update
   - Method/path: `PATCH /stores/{store}/status`
   - Purpose: toggle store open/closed without requiring full store update.
   - Body: `{ "status": "active" | "inactive" }` or `{ "isOpen": true|false }`.
   - Response: `StoreResource`.
   - Auth: admin or tenant owner.
   - Tenant validation: store must belong to tenant owner unless admin.

2. Store settings/resource alignment
   - Method/path: update existing `PATCH /stores/{store}` and `StoreResource`.
   - Purpose: support Flutter settings screens reliably.
   - Body additions: `defaultLanguage`, `bio`, `status`, `telegramChannelId`, `telegramAutoPost`, `themeSettings`.
   - Response additions: same fields.
   - Auth: admin or tenant owner.
   - Priority reason: current UI references these fields but API/resource are incomplete.

3. Realtime channel authorization for store notifications
   - Method/path: Laravel broadcast auth for `private-store.{storeId}` or consistent channel naming.
   - Purpose: allow dashboard clients to receive `order.created`.
   - Body: standard broadcasting auth payload.
   - Response: standard broadcast auth response.
   - Auth: user must own/access store or be admin.

4. Notification polling/list endpoint
   - Method/path: `GET /notifications`
   - Purpose: dashboard notifications list independent of loaded orders.
   - Query: `store_id`, `unread`, `limit`, `cursor`.
   - Response: notification rows with id/type/title/body/storeId/orderId/readAt/createdAt.
   - Auth: admin/owner/employee scoped by role.

### High

5. FCM/APNs device registration for Flutter
   - Method/path: `POST /devices` or `POST /push/fcm-token`
   - Body: `platform`, `token`, optional `deviceId`, `storeId`.
   - Response: registered device id.
   - Auth: authenticated user.
   - Tenant validation: if `storeId`, validate access.

6. Telegram settings endpoint
   - Method/path: `GET /stores/{store}/telegram-settings`, `PATCH /stores/{store}/telegram-settings`
   - Purpose: avoid overloading store update and expose all safe Telegram fields.
   - Body: chat/user/group/channel ids, notification settings, auto post, optional message thread/topic id.
   - Response: same safe fields plus bot username/deeplink status.
   - Auth: admin or tenant owner.
   - Must not include bot token.

7. Telegram test notification
   - Method/path: `POST /stores/{store}/telegram/test`
   - Body: optional `target` in `user,group,channel,all`.
   - Response: delivery results.
   - Auth: admin or tenant owner.
   - Feature: should gate `telegram_bot`.

8. Buyer update/blacklist endpoints
   - Methods/paths: `PATCH /buyers/{buyer}`, `PATCH /buyers/{buyer}/blacklist`
   - Body: profile fields and `isBlacklisted`.
   - Response: `BuyerResource`.
   - Auth: admin or tenant owner; employees denied.

9. Store-owner custom limits read endpoint
   - Method/path: add `userLimit` to `GET /billing/current` or create `GET /billing/limits`.
   - Response: limits/pricing/base/total/currency plus usage.
   - Auth: tenant owner/admin.
   - Purpose: Flutter Limits/Pricing page for store owners.

10. Admin broadcast endpoint or remove page requirement
    - Method/path: `POST /admin/broadcast`
    - Body: `title`, `message`.
    - Response: delivery summary.
    - Auth: admin only.
    - Note: current web page calls this route, but backend route is missing.

### Medium

11. Paginated dashboard feature endpoints
    - Paths: `/dashboard/stats`, `/products`, `/orders`, `/buyers`, `/admin/users`, `/admin/subscriptions` with consistent pagination/search.
    - Purpose: avoid relying on large `/dashboard/init`.

12. Media delete/replace
    - Paths: `DELETE /media/{media}`, `PATCH /media/{media}`.
    - Auth: admin or tenant owner.
    - Tenant validation: media store must belong to owner.

13. Product archive endpoint
    - Path: `PATCH /products/{product}/archive` or `PATCH /products/{product}/active`.
    - Purpose: avoid destructive delete for common dashboard action.

14. Audit log list endpoint
    - Path: `GET /admin/audit-logs`.
    - Auth: admin.
    - Current dashboard only receives audit logs via `/dashboard/init`.

15. API key management backend
    - Paths: `GET/POST/DELETE /admin/api-keys`.
    - Auth: admin.
    - Current API Keys page is local-only and not backed by Laravel.

### Low

16. Buyer auth endpoints for storefront
    - Path currently referenced: `POST /buyers/auth`.
    - Needed only if Flutter also manages customer login or if storefront buyer auth remains desired.

17. API docs endpoint
    - Path shown in UI: `/api/v1/docs`.
    - Current route missing.

## Backend Fixes Recommended Before Flutter Build

1. Align `StoreRequest`, `StoreController`, and `StoreResource` with all store settings fields.
2. Add a real notification model/API or documented realtime contract.
3. Add store broadcast channel authorization for `private-store.{id}`.
4. Restrict `telegram/setup-webhook` to admin.
5. Gate Telegram linking/settings with `telegram_bot` feature.
6. Add store-owner custom limits to `/billing/current`.
7. Add buyer update/blacklist endpoints.
8. Add pagination to admin and dashboard list endpoints.
9. Normalize API response envelopes.
10. Fix Al-Waseet settings to use selected store instead of `user->store` if Flutter will expose it.

## Flutter Safety Rules

- Never expose `.env`, Telegram bot token, Al-Waseet credentials, API keys, or backend secrets.
- Never trust local selected store id. Validate against authenticated accessible stores.
- Always send `X-Store-ID` only after auth/store validation.
- Treat backend as source of truth for totals, permissions, limits, and tenant ownership.
- Do not add order limits in Flutter. Display order usage only as analytics, never as a blocker.
- Normalize all response shapes in the Flutter API client.
- Do not depend on missing endpoints without clearly documenting backend prerequisites.
