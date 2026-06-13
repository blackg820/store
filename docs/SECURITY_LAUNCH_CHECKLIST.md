# Security Launch Checklist

## Secrets

- No provider secrets in frontend bundles, env examples, logs, health responses, docs screenshots, or API responses.
- `BUNNY_API_KEY`, Telegram tokens, Al-Waseet credentials, push private keys, and provider payload dumps stay backend-only.
- `.env.example`, `.env.testing.example`, `.env.testing.mysql`, and `frontend-nuxt/.env.example` contain placeholders only.

## API And Auth

- CORS allows only expected production domains.
- Sanctum stateful domains and token expiry are configured for dashboard domains.
- Admin routes are protected with `auth:sanctum` and `can:admin`.
- Read-only/support/viewer roles cannot mutate data.
- Password change revokes existing tokens.
- Login and refresh endpoints are throttled.

## Tenant Isolation

- Store-scoped dashboard requests carry validated `X-Store-ID`.
- Tenant denial codes remain stable: `TENANT_ACCESS_DENIED` and `UNAUTHENTICATED_TENANT`.
- Employees are limited to catalog routes and owner-inherited stores.
- Public product detail validates `storeSlug` or host tenant before rendering product data.
- Custom domain routing resolves only active/verified stores.

## Public Abuse Protection

- Public checkout is throttled and recalculates totals server-side.
- Public analytics event endpoint is throttled and validates event type.
- Customer notification subscribe/unsubscribe/open/click endpoints are throttled.
- Domain resolve is throttled to reduce enumeration.
- Notification campaigns require authenticated owner/admin scope and feature gates.

## Uploads And Providers

- Upload validation enforces allowed MIME types and size limits.
- Product media uses product/store tenant ownership checks.
- Bunny uploads and deletes run through backend services only.
- Provider failures are logged as sanitized system events.
- Telegram posting has duplicate guard and feature gate.

## Logging And Observability

- Logs and `system_events` do not store tokens, secrets, raw provider payloads, or raw push endpoint keys.
- Failed jobs and queue depth are monitored.
- Health endpoints are secret-free.
- Admin ops dashboard is admin-only.

## Launch Review

- Run dependency audit and decide accepted risks.
- Verify production env vars are present and not exposed to browser runtime.
- Verify wildcard DNS/SSL for storefront subdomains.
- Verify custom domain SSL onboarding strategy before enabling self-service custom domains.
- Verify backup restore procedure, not only backup creation.
