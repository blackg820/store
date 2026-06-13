# Enterprise Upgrade Plan

Last updated: 2026-06-13

This document records the production-grade enterprise upgrade pass. The project is not being rebuilt from scratch; existing Laravel `/api/v1`, Next dashboard/storefront, billing, media, Telegram, Bunny, Al-Waseet, notification, and translation behavior remains the compatibility baseline.

## Current Architecture Report

- Frontend: Next.js App Router with dashboard pages under `app/dashboard`, public storefront under `app/store/[slug]`, API proxy under `app/api/v1/[...path]`, and host/subdomain routing in `middleware.ts`.
- Backend: Laravel API under `backend/routes/api.php`, Sanctum auth, controllers/resources/models/services, queued jobs, Reverb channels, Bunny media service, Telegram service, Al-Waseet service, and dynamic subscription service.
- Tenancy: store owner is tenant root; employees inherit parent owner access; selected dashboard store is validated with `X-Store-ID` through Laravel tenant middleware.
- Storefront: existing `/store/{slug}` stays supported. Subdomain/custom-domain support now resolves hosts to stores while preserving the old slug path.
- Data model: core SaaS tables already cover users, stores, products, categories, product types, variants, media, buyers, orders, billing, notifications, device tokens, and audit logs.
- Queues: jobs exist for push notifications, Bunny cleanup, Telegram/order notifications, and Al-Waseet. Customer notification campaign dispatch now also uses the queue.

## Problems Report

- Store routing was slug-first and did not have first-class subdomain/custom-domain fields.
- Customer risk was owner-local through buyers; there was no global phone-based risk profile across stores.
- Marketing/customer notification data model was missing.
- Analytics was a small order/revenue summary and did not expose full owner/platform metric groups.
- Tenant routing depended on frontend host rewrites without a backend host resolver/cache.
- Audit logging exists but is not yet wired into every sensitive action.
- Dashboard bootstrap remains a large payload and should be split or paginated for high scale.
- Provider delivery for customer marketing notifications is staged through database/queue rows; full PWA/mobile provider workers still need a delivery implementation.

## Implemented In This Pass

### Domain Architecture

- Added store fields:
  - `subdomain`
  - `custom_domain`
  - `domain_verified_at`
- Added reserved subdomain validation:
  - `admin`, `api`, `app`, `dashboard`, `cdn`, `media`, `ftp`, `mail`, `www`, `support`, `help`, `docs`, `status`
- Added `DomainTenantService` for normalization, validation, Redis/Laravel-cache-backed host resolution, and cache invalidation.
- Added public resolver: `GET /api/v1/public/domain/resolve?host=...`.
- Added dashboard availability check: `GET /api/v1/stores/check-domain`.
- Updated store create/update/settings to accept `subdomain`, `customDomain`, and `custom_domain`.
- Custom domains are gated by the existing `custom_domain` subscription feature.
- Updated Next middleware to preserve reserved operational subdomains and rewrite store/custom hosts to existing storefront routes.

### Global Customer Risk

- Added `global_customers` table.
- Added `global_customer_id` to buyers and orders.
- Added `CustomerRiskService` for normalized phone identity and risk updates.
- Risk rules:
  - `0` rejected orders: `normal`
  - `1-2` rejected orders: `warning`
  - `3+` rejected orders: `high_risk`
- Public and dashboard order creation attach global customer profiles.
- Order status changes to `returned` or `problematic` update global rejection counts only when entering a rejected state.
- Order and buyer API resources now expose global risk fields.
- No automatic risk-based blocking was added. Existing buyer blacklist behavior remains separate.

### Customer Notifications

- Added tables:
  - `customer_notification_subscriptions`
  - `customer_notification_campaigns`
  - `customer_notification_deliveries`
- Added public subscribe/unsubscribe endpoints.
- Added owner/admin campaign list/create and delivery list endpoints.
- Campaign dispatch is queue-based through `DispatchCustomerNotificationCampaign`.
- Device endpoints/keys are encrypted/hidden and are not exposed to stores.
- Templates support multilingual JSON payloads.
- Delivery rows track queued, delivered, opened, clicked, and failure state.

### Analytics

- Added `analytics_events` table.
- Added public tracking endpoint: `POST /api/v1/public/analytics/events`.
- Expanded `GET /api/v1/analytics/dashboard` with:
  - owner order counts for today/week/month
  - revenue today/week/month/year
  - status counts and rejection/delivery rates
  - product totals, low stock, out of stock
  - new/returning/high-risk customers
  - visits, unique visitors, conversion rate, checkout starts, device breakdown
  - notification delivery/open/click counts
  - platform user/store/order/infrastructure summary for admins

## Migration Plan

Migration order:

1. Deploy code with the new migration present.
2. Run `php artisan migrate --pretend` against production-like configuration and review SQL.
3. Run `php artisan migrate` during a low-traffic window.
4. Backfill subdomains and global customer risk after the schema is live.
5. Enable frontend subdomain routing only after DNS/ingress and backfill are verified.

Safety notes:

- New store domain columns are nullable, so existing stores continue to work.
- New global customer, notification, and analytics tables are additive.
- Buyer/order links to global customers are nullable for incremental backfill.
- Indexes are explicitly named and guarded where possible to avoid duplicate-index failures in partially upgraded environments.
- Rollback drops only the additive tables, columns, and indexes from this slice.
- Large existing-table changes are limited to nullable columns and secondary indexes. For very large production tables, run the migration through an online schema change tool or a managed maintenance window.

1. Deploy code without enabling subdomain-only storefront links.
2. Run migrations:
   - `php artisan migrate`
3. Backfill store subdomains in a maintenance command or one-off script:
   - default candidate: existing `stores.slug`
   - skip or rename reserved values
   - resolve duplicates manually before enforcing public links
4. Configure DNS/ingress:
   - `dashboard.example.com` to Next dashboard app
   - `api.example.com` to Laravel API/proxy
   - `*.example.com` to storefront app
   - custom domains CNAME/A record to storefront ingress
5. Set environment:
   - `NEXT_PUBLIC_USE_SUBDOMAINS=true`
   - `NEXT_PUBLIC_ROOT_DOMAIN=example.com`
   - `STOREFRONT_BASE_DOMAIN=example.com`
   - Redis-backed Laravel cache for production tenant resolution
6. Start queue workers for `notifications`.
7. Backfill global customers from existing buyers/orders:
   - normalize buyer/order phone
   - create/update `global_customers`
   - set `buyers.global_customer_id`
   - set `orders.global_customer_id`
   - calculate rejection counts from `returned` and `problematic` orders
8. Introduce subdomain URLs in UI after DNS and backfill are verified.
9. Enable custom domain verification workflow per store after support tooling is ready.

Rollback strategy:

1. Disable new UI entry points for domains/customer notifications if needed.
2. Stop notification campaign workers.
3. Run `php artisan migrate:rollback --step=1` only if no production data must be kept in the new tables.
4. Prefer a forward fix over rollback after campaigns, analytics events, or global customer risk rows are in active use.
5. Keep `/store/{slug}` enabled throughout rollback; existing storefront URLs remain compatible.

## API Additions

- `GET /api/v1/public/domain/resolve`
- `POST /api/v1/public/analytics/events`
- `GET /api/v1/stores/check-domain`
- `POST /api/v1/public/customer-notifications/subscribe`
- `POST /api/v1/public/customer-notifications/unsubscribe`
- `POST /api/v1/public/customer-notifications/deliveries/{delivery}/open`
- `POST /api/v1/public/customer-notifications/deliveries/{delivery}/click`
- `GET /api/v1/customer-notifications/subscriptions`
- `GET /api/v1/customer-notifications/campaigns`
- `POST /api/v1/customer-notifications/campaigns`
- `GET /api/v1/customer-notifications/campaigns/{campaign}/deliveries`

## Security Notes

- Backend remains source of truth for tenant ownership.
- Store owners cannot access customer notification device endpoint payloads or keys.
- Bunny keys, Telegram tokens, Al-Waseet credentials, and provider payloads remain backend-only.
- Custom domains are stored only as hostnames and are pending until verified.
- Reserved subdomains are blocked at validation and bypassed in Next middleware.
- Orders remain unlimited; no SaaS order limits were introduced.

## Remaining Work

- Add a formal custom-domain verification token/DNS challenge and admin verification UI.
- Add provider workers for PWA/mobile campaign deliveries.
- Add audit events for login/logout, password changes, store/product/order/subscription/employee/domain/risk changes.
- Add analytics aggregation tables/jobs if raw event volume grows beyond cached query-time analytics.
- Split dashboard bootstrap into paginated module endpoints.
- Add feature tests for domain validation, host resolution, risk updates, notification campaign access, analytics tracking, and tenant isolation.
- Add backfill artisan commands for subdomains and global customer risk.

## Frontend Integration Notes

- Next storefront requests resolve the current `Host` through `/api/v1/public/domain/resolve` before falling back to `/store/{slug}` compatibility.
- Reserved operational hosts are blocked from storefront rendering.
- Product and store metadata now use the resolved host for canonical and Open Graph URLs.
- Store owners/admins manage domains from dashboard Settings -> Domains.
- Customer risk is visible in the orders table and order detail dialog, but fulfillment actions remain manual.
- Store owners/admins manage customer notification campaigns from `/dashboard/customer-notifications`.
- Storefront buyers can opt into PWA notification preferences near the footer; unsupported browsers and denied permissions are handled without exposing raw endpoints.

## Analytics Hardening Notes

- `analytics_events` has store/type/date indexes.
- `GET /analytics/dashboard` accepts `range` and store context and caches heavier chart/top-product queries for five minutes by tenant/store/range.
- Avoid storing buyer names, phone numbers, addresses, or provider payloads in analytics event metadata.
- Recommended retention: keep raw analytics events for 90-180 days, then aggregate or prune.
- Recommended scheduled jobs: daily traffic/product/campaign rollups and monthly cleanup of old raw events.

## Environment Variables

- `NEXT_PUBLIC_USE_SUBDOMAINS=true`
- `NEXT_PUBLIC_ROOT_DOMAIN=example.com`
- `NEXT_PUBLIC_APP_URL=https://dashboard.example.com`
- `NEXT_PUBLIC_API_URL=https://api.example.com` or the existing proxy origin
- `STOREFRONT_BASE_DOMAIN=example.com`
- Laravel cache should use Redis in production for tenant/domain and analytics cache.
- PWA push provider delivery still requires a future VAPID/FCM/APNs delivery worker; current customer notification UI stores preferences and endpoint data when available.
