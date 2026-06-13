# API Client Contract

Base API path: `/api/v1`.

Laravel remains the source of truth for dashboard, storefront, Flutter, and Nuxt behavior.

## Response Format

Success:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "The given data was invalid.",
  "errors": {},
  "details": {}
}
```

Limit errors may include `upgrade`.

## Required Headers

- `Accept: application/json`
- `Content-Type: application/json` when sending JSON
- `Accept-Language: ar|en|ku`
- `Authorization: Bearer {accessToken}` for authenticated routes
- `X-Store-ID: {storeId}` only after the selected store has been validated for the authenticated user

Public storefront host resolution should use `/public/domain/resolve?host={host}` server-side.

Nuxt implementation note: `frontend-nuxt/plugins/api.js` is JavaScript-only and should remain aligned with this contract. It should use `NUXT_INTERNAL_API_BASE_URL` during SSR and `NUXT_PUBLIC_API_BASE_URL` in the browser when direct Laravel access is needed.

## Auth Token Handling

- Login: `POST /auth/login` returns `accessToken`, `refreshToken`, and `user`.
- Refresh: `POST /auth/refresh` with `refreshToken` returns rotated tokens.
- Logout: `POST /auth/logout` with optional `refreshToken`.
- Password change revokes all tokens and returns a session-revoked flow.

Clients should use single-flight refresh so concurrent 401 responses do not rotate refresh tokens multiple times. The current Nuxt scaffold mirrors the token contract in cookies; before production cutover, prefer HTTP-only cookies or a Laravel session bridge for SSR hardening.

## Tenant Store Context

Authenticated store-scoped dashboard requests should send `X-Store-ID`.

Rules:

- Never trust a locally persisted store id.
- Validate selected store against `/dashboard/init` or a store list owned by the authenticated user.
- On `TENANT_ACCESS_DENIED` or `UNAUTHENTICATED_TENANT`, clear selected store and retry safe `GET` requests once without the tenant header.
- Do not send `X-Store-ID` for login, refresh, public storefront, public checkout, or admin all-tenant views unless explicitly scoped.

## Status Handling

- `401`: refresh once if a refresh token exists; otherwise clear session and redirect to login.
- `403`: show permission/tenant/feature error. Clear selected store on tenant denial codes.
- `422`: preserve field errors from `errors`.
- `429`: show rate-limit copy and avoid automatic rapid retry.
- `500`: show generic retryable error; never display stack traces or provider payloads.

## Safe Public Endpoints

Public endpoints are throttled and must be treated as untrusted:

- Store/product reads
- Domain resolve
- Public checkout
- Analytics events
- Customer notification subscribe/unsubscribe/open/click

## Frontend Secret Policy

Frontend clients must never receive:

- `BUNNY_API_KEY`
- Telegram bot tokens or webhook secrets
- Al-Waseet credentials or provider payload dumps
- Push service private keys
- Raw notification endpoint/key data in dashboard responses

Use backend-only provider services and sanitized errors/events.
