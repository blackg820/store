# Billing And Subscriptions API

Endpoints:
- `GET /billing/current`
- `GET /billing/usage`
- `POST /billing/checkout-session`

Usage and plan responses expose backend-owned feature availability and limits. Orders are intentionally excluded from subscription limiting. Storage usage is enforced on upload paths, including product media and store branding uploads.
