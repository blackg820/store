# Dokani Role Contract

The Flutter dashboard should render UI from backend user role and permissions, but Laravel remains authoritative.

## Roles

- `admin`: platform users, stores, plans, subscriptions, features, limits, broadcasts, and system analytics.
- `store_owner`: own stores, catalog, orders, buyers, media, Telegram settings, billing view/checkout.
- `employee`: backend-approved operational modules. Current policy allows product/category work and restricts sensitive store, buyer, billing, Telegram setup, and destructive order work.
- `support`: read-only operational visibility.
- `viewer`: read-only operational visibility.

## Store Selector

Flutter must build selectable stores only from `/dashboard/init` or `/stores`. Persisted local store ids are untrusted until the backend confirms access.

Clear selected store on:

- `UNAUTHENTICATED_TENANT`
- `TENANT_ACCESS_DENIED`

## Read-Only UX

For `support` and `viewer`, hide create/update/delete controls and treat any `READ_ONLY_ROLE` response as a server-confirmed denial.
