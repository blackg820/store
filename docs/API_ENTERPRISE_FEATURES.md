# Enterprise Feature APIs

Last updated: 2026-06-13

Base path: `/api/v1`.

## Domains

- `GET /public/domain/resolve?host=mystore.example.com`
  - Public.
  - Resolves a verified custom domain or configured subdomain to a store resource.

- `GET /stores/check-domain?subdomain=mystore&customDomain=shop.example.com&ignoreStoreId=1`
  - Authenticated.
  - Checks reserved subdomains, uniqueness, and hostname shape.

Store create/update/settings accept:

- `subdomain`
- `customDomain` or `custom_domain`

Custom domains require the `custom_domain` entitlement.

Frontend notes:

- Storefront server rendering resolves `Host` first, then falls back to slug compatibility.
- Reserved dashboard/API/support hosts must not render storefront tenants.
- Canonical and Open Graph URLs should use the resolved storefront host.

## Customer Risk

Risk is global by normalized phone number.

Rules:

- `normal`: 0 rejected orders
- `warning`: 1-2 rejected orders
- `high_risk`: 3+ rejected orders

Order and buyer resources include risk fields. Risk does not automatically block orders.

## Customer Notifications

- `POST /public/customer-notifications/subscribe`
  - Public.
  - Body: `storeId`, `phone`, `channel`, optional `language`, `endpoint`, `keys`, `metadata`.
  - Channels: `pwa`, `mobile`, `telegram`.

- `POST /public/customer-notifications/unsubscribe`
  - Public.
  - Body: `storeId`, `channel`, plus `endpoint` or `phone`.

- `GET /customer-notifications/subscriptions?storeId=...`
  - Authenticated owner/admin.
  - Device endpoints and keys are hidden.

- `GET /customer-notifications/campaigns?storeId=...`
  - Authenticated owner/admin.

- `POST /customer-notifications/campaigns`
  - Authenticated owner/admin.
  - Body: `storeId`, `name`, `channels`, `template`, optional `segment`, `scheduledAt`, `status`.
  - `status=draft` saves without dispatch.
  - `status=scheduled` dispatches `DispatchCustomerNotificationCampaign` on the notifications queue.

- `GET /customer-notifications/campaigns/{campaign}/deliveries`
  - Authenticated owner/admin.

- `POST /public/customer-notifications/deliveries/{delivery}/open`
  - Public tracking endpoint.

- `POST /public/customer-notifications/deliveries/{delivery}/click`
  - Public tracking endpoint.

## Analytics

- `POST /public/analytics/events`
  - Public.
  - Body: `eventType`, optional `storeId`, `storeSlug`, `productId`, `campaignId`, `visitorId`, `deviceType`, `locale`, `metadata`.
  - Event types: `visit`, `product_view`, `checkout_start`, `campaign_open`, `campaign_click`.

- `GET /analytics/dashboard`
  - Authenticated.
  - Owner/store-scoped by tenant access and optional `store_id` or `X-Store-ID`.
  - Admins receive additional platform summary.
  - Optional `range`: `7d`, `30d`, `90d`, `year`.
  - Heavier chart/top-product sections are cached briefly by tenant/store/range.
  - Dated ranges use daily aggregate tables when backfilled, with raw query fallback during rollout.

## Operations

- `GET /ops/health`
  - Public lightweight Laravel health endpoint.

- `GET /ops/health/deep`
  - Public sanitized deep health endpoint for app, database, cache, queue, storage, Bunny configuration, and scheduler heartbeat.

- `GET /admin/ops/summary`
  - Admin-only operations summary for queue pressure, failed jobs, recent system events, provider failures, notification failures, storage usage, tenant/domain failures, and slow analytics counters.

- `php artisan analytics:aggregate-daily`
  - Aggregates store/product/notification/platform daily stats.
  - Supports `--date`, `--from`, `--to`, `--store`, and `--retention-days`.

## PWA Push Setup

- Storefront UI asks permission only after buyer action.
- Unsupported browsers can still save a phone-based preference.
- Raw push endpoint and keys are sent to the backend only and are hidden from dashboard responses.
- Provider delivery workers are still required to send real push payloads from queued delivery rows.
