# Dokani Dashboard API Contract

Base URL: `https://store.blackt.uk/api/v1`

The Laravel backend is the source of truth for authentication, tenancy, roles, permissions, SaaS limits, totals, notifications, and integrations. Flutter dashboard clients must not call local URLs in production.

## Response Shape

Successful responses use:

```json
{ "success": true, "message": "optional", "data": {} }
```

Error responses use:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Safe user-facing message",
  "errors": {},
  "details": {}
}
```

Backend errors must not expose `.env` values, API keys, Telegram bot tokens, Al-Waseet credentials, stack traces, or raw provider responses.

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/user`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `PATCH /profile`
- `PATCH /profile/password`

Login returns `accessToken`, `refreshToken`, and a safe user resource with `role`, `parentId`, permissions, and subscription fields. Password changes revoke sessions and return `SESSION_REVOKED`.

## Tenancy

Store-scoped dashboard calls should send `X-Store-ID` after Flutter validates the selected store from `/dashboard/init` or `/stores`.

Tenant errors:

- `401 UNAUTHENTICATED_TENANT`: store header was sent without valid auth.
- `403 TENANT_ACCESS_DENIED`: selected store is missing, invalid, or belongs to another tenant.

Flutter must clear the selected store on these codes.

## Roles

Supported roles:

- `admin`: platform management.
- `store_owner`: own stores, catalog, orders, buyers, media, billing, Telegram.
- `employee`: backend-approved operational modules.
- `support`: read-only dashboard access unless explicitly expanded later.
- `viewer`: read-only dashboard access.

The backend enforces role restrictions. Flutter UI hiding is advisory only.

## Store And Catalog

Stores:

- `GET /stores`
- `POST /stores`
- `GET /stores/{store}`
- `PATCH /stores/{store}`
- `DELETE /stores/{store}`
- `PATCH /stores/{store}/status`
- `GET /stores/{store}/settings`
- `PATCH /stores/{store}/settings`

Products:

- `GET /products`
- `POST /products`
- `GET /products/{product}`
- `PATCH /products/{product}`
- `DELETE /products/{product}`
- `POST /products/{product}/telegram`

Product options and variants are dynamic. Do not hardcode only color/size in Flutter.

## Orders And Buyers

Dashboard order management:

- `GET /orders`
- `GET /orders/{order}`
- `PATCH /orders/{order}`
- `PATCH /orders/{order}/status`
- `DELETE /orders/{order}`
- `POST /orders/{order}/alwaseet`

Customers place orders through the public storefront only: `POST /public/orders`. SaaS order limits are not enforced.

Buyers:

- `GET /buyers`
- `POST /buyers`
- `GET /buyers/{buyer}`
- `PATCH /buyers/{buyer}`
- `POST /buyers/{buyer}/blacklist`
- `DELETE /buyers/{buyer}/blacklist`

## Billing

- `GET /billing/current`
- `GET /billing/usage`
- `POST /billing/calculate`
- `POST /billing/checkout-session`

Limit keys include `max_stores`, `max_products`, `max_employees`, `storage_gb`, `api_requests`, `telegram_bots`, `integrations_count`, and `custom_domains`. Order limits are intentionally excluded.

## Notifications And Realtime

Notifications:

- `GET /notifications`
- `PATCH /notifications/{notification}/read`
- `POST /notifications/read-all`
- `PATCH /notifications/read-all`
- `GET /device-tokens`
- `POST /device-tokens`
- `DELETE /device-tokens/{deviceToken}`

Realtime uses Laravel Reverb/Pusher-compatible private store channels. Flutter subscribes to `private-store.{storeId}` and must unsubscribe when the selected store changes.

## Telegram

- `POST /telegram/link-bot`
- `POST /telegram/setup-webhook`
- `GET /stores/{store}/telegram-settings`
- `PATCH /stores/{store}/telegram-settings`
- `POST /stores/{store}/telegram-settings/test`
- `POST /stores/telegram/validate-channel`
- `POST /products/{product}/telegram`

The platform-managed bot token is backend-only. Flutter must never send or display bot tokens.

## Runtime Requirements

- Queue workers must run for push delivery and Bunny/CDN cleanup.
- Reverb/Pusher environment must be configured for realtime.
- `TELEGRAM_WEBHOOK_SECRET` should be configured in public environments and webhook setup rerun by an admin.
- Test runtime needs the SQLite PDO driver or a configured test MySQL database.
