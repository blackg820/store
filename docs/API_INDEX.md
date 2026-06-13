# Dokani Dashboard API Index

Base path: `/api/v1`

All authenticated dashboard requests use Bearer auth. Store-scoped requests should send `X-Store-ID`. Success responses use `{ "success": true, "message": "...", "data": ... }`. Errors use `{ "success": false, "code": "...", "message": "...", "errors": {}, "details": {} }`.

Modules:
- [Auth](./API_AUTH.md)
- [Stores](./API_STORES.md)
- [Products](./API_PRODUCTS.md)
- [Media](./API_MEDIA.md)
- [Orders](./API_ORDERS.md)
- [Categories](./API_CATEGORIES.md)
- [Product Types](./API_PRODUCT_TYPES.md)
- [Billing](./API_BILLING_SUBSCRIPTIONS.md)
- [Telegram](./API_TELEGRAM.md)
- [Notifications](./API_NOTIFICATIONS.md)
- [Enterprise Features](./API_ENTERPRISE_FEATURES.md)
- [Production Readiness](./PRODUCTION_READINESS.md)
- [Local Testing](./LOCAL_TESTING.md)
- [API Client Contract](./API_CLIENT_CONTRACT.md)
- [Nuxt Migration Plan](./NUXT_MIGRATION_PLAN.md)
- [Frontend Nuxt-Only Target](./FRONTEND_NUXT_ONLY.md)
- [Nuxt Deployment Notes](./DEPLOYMENT_NUXT.md)
- [Security Launch Checklist](./SECURITY_LAUNCH_CHECKLIST.md)
- [Users and Roles](./API_USERS_ROLES_PERMISSIONS.md)
- [Analytics](./API_DASHBOARD_ANALYTICS.md)
- [Errors](./API_ERRORS.md)
- [Flutter Dashboard Guide](./FLUTTER_DASHBOARD_API.md)
- [Known Gaps](./KNOWN_API_GAPS.md)
