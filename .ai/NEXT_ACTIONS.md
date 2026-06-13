# Next Actions

Last updated: 2026-05-10

## Flutter Dashboard Prerequisites

1. Before building the separate Flutter Dashboard, read `.ai/FLUTTER_DASHBOARD_API_AUDIT.md` and `.ai/FLUTTER_DASHBOARD_BUILD_PROMPT.md`.
2. Keep the Flutter Dashboard separate from the existing public storefront. The public storefront remains the current web frontend.
3. Add or align store settings APIs for `status`/open-closed, `defaultLanguage`, `bio`, `telegramChannelId`, `telegramAutoPost`, and complete theme/settings response fields. Priority: Critical.
4. Add notification list/polling API or fix realtime private store channel authorization for `OrderCreated` on `store.{id}`. Priority: Critical.
5. Add FCM/APNs device-token registration only if mobile push notifications are required. Priority: High.
6. Restrict `POST /telegram/setup-webhook` to admins before exposing it in any Flutter admin UI. Priority: High.
7. Add Telegram test-notification and settings endpoints if Flutter should manage Telegram beyond current store update/link flows. Priority: High.
8. Add buyer update and blacklist/unblacklist endpoints before building customer risk management mutations. Priority: High.
9. Expose store-owner custom limits in `/billing/current` or a new `/billing/limits` endpoint. Priority: High.
10. Add media delete/replace endpoints before building a full media library. Priority: Medium.
11. Do not implement order-limit UI. Orders have no SaaS order limits.

## Top 20 Bug Fixes

1. Restore backend test execution by installing SQLite PDO or moving tests to MySQL. Risk: Critical.
2. Implement email password reset flow with token revocation and account-security audit events. Login/refresh inactive checks, password-change revocation, suspension revocation, logout, and logout-all now exist. Risk: Critical.
3. Add tenant policy tests for stores/products/orders/media/employees. Risk: Critical.
4. Add public storefront CI/smoke tests for valid subdomain product detail, missing product not-found state, no infinite skeleton, cross-store product rejection, and checkout cross-store product rejection. Risk: Critical.
5. Persist `variant_id` on order items. Product detail now performs client-side variant price/stock matching for UX, but order items still store only options. Risk: High.
6. Add buyer tenant phone unique constraint. Risk: High.
7. Split dashboard init payload to avoid N+1/large loads. Risk: High.
8. Add robust API pagination to admin users/subscriptions/plans. Risk: High.
9. Add media quota reservation locks and tracked deployment upload-size config. Risk: High.
10. Harden Telegram webhook verification. Risk: High.
11. Add Al-Waseet token isolation CI tests. Risk: High.
12. Protect canonical feature codes from accidental admin changes. Risk: High.
13. Standardize all error responses globally. Risk: High.
14. Add policies/FormRequests for all core resources. Risk: High.
15. Add order status transition validation. Risk: Medium.
16. Validate store theme/settings JSON. Risk: Medium.
17. Add product import limit enforcement. Risk: Medium.
18. Remove/quarantine legacy Next DB helpers. Risk: Medium.
19. Add audit logs for admin billing changes. Risk: Medium.
20. Mark legacy SQL script as generated/legacy. Risk: Low.

## Top 20 UI/UX Improvements

1. Build custom-limit audit/history UI for platform admins. Admin user creation/editing now has per-user limits and invoice simulation; audit/history is still needed.
2. Add invoice simulation panel to billing admin.
3. Add upgrade prompts for `PLAN_LIMIT_REACHED` and `FEATURE_DISABLED`.
4. Split dashboard pages into paginated server-backed tables.
5. Continue standardizing dashboard page shell, section spacing, and metric cards. Shared `DashboardPageHeader`, cleaned overview, sidebar/topbar, product section search, role-aware metric cards, and redesigned store list now exist; store create/edit wizard, settings, and billing still need polish.
6. Add consistent loading/error/empty states across individual dashboard pages. Dashboard route-level `loading.tsx` and `error.tsx` now exist; shell search and product sections have empty states.
7. Improve store switcher clarity for employee accounts.
8. Add quick actions: product, order, media, upgrade, storefront.
9. Add mobile-first visible add-to-cart on all storefront cards. Main storefront profile/products/category views now have visible add-to-cart, stock labels, details shortcut, and sticky mobile cart; product detail now server-hydrates slug-scoped product data, passes plain params to the client, normalizes nullable DTO fields, and has a sticky mobile CTA, while checkout confirmation still needs polish.
10. Add storefront featured/best-seller/trending sections from backend. Public API returns these sections; profile storefront now shows featured, best-sellers when present, and new-arrival fallbacks. Next step is cache invalidation and real review data.
11. Add low-stock and discount badges. Main storefront now shows discount and low-stock badges; expand urgency rules after inventory reservation exists.
12. Add order confirmation screen after checkout.
13. Add WhatsApp redirect confirmation choice.
14. Improve Al-Waseet settings validation feedback.
15. Add Telegram preview/testing flow.
16. Add billing current usage cards.
17. Add product variant stock warnings.
18. Add deeper search/filter controls to product type/category pages. Global dashboard shell search now reaches categories, but the page still needs local tree filtering.
19. Add buyer risk/blacklist explanation in UI.
20. Replace browser confirm dialogs with shared confirm dialogs and add accessibility labels/tooltips to icon buttons. Browser confirms remain in products/orders/users/employees tables; Stores now uses alert-dialog delete confirmation.
21. Remove deprecated `components/dashboard/header.tsx` after confirming no external imports. It now delegates to `MainStoreSelector`, but the active dashboard shell uses `ShellTopbar`. Risk: Low.

## Top 20 Logic Improvements

1. Centralize tenant context service.
2. Replace manual ownership checks with policies.
3. Move checkout pricing into dedicated service.
4. Add order status state machine.
5. Add usage rollup/reset scheduler.
6. Add idempotency keys for public checkout.
7. Add product variant matching service.
8. Add stock decrement/reservation logic.
9. Add domain model events for billing/limits.
10. Add audit events for sensitive actions.
11. Normalize buyer risk calculation service.
12. Add cache invalidation on product/store update.
13. Add generated API DTO contract docs.
14. Add strict plan status/archive semantics.
15. Add subscription override management.
16. Add employee permission matrix. Current baseline restricts employees to product and category create/update only; granular permissions per employee are still future work.
17. Add media cleanup job.
18. Add notification retry/backoff.
19. Add plan recommendation logic based on needed quantity.
20. Add public product slugs scoped to store.

## Top 20 SaaS Improvements

1. Stripe-compatible checkout sessions for custom user-limit invoices.
2. Customer billing portal.
3. Usage invoices and overage billing.
4. Enterprise feature overrides UI.
5. Multi-store employee assignments.
6. Custom domains gated by `custom_domain`.
7. Premium support workflow gated by `premium_support`.
8. API key management and rate limits.
9. Storefront cache by tenant/store tag.
10. Onboarding checklist for new owners, including store setup progress and first-product/first-order prompts.
11. Trial lifecycle and conversion nudges.
12. Dunning/past due state handling.
13. Tenant export/delete workflows.
14. Platform admin audit dashboard.
15. Tenant access audit log.
16. Custom limit upgrade/downgrade preview.
17. Usage forecast alerts.
18. Webhook integration framework.
19. Store owner analytics summaries.
20. Multi-region media/CDN strategy.

## Top 20 Performance/Security Improvements

1. Redis for API request metering.
2. Redis queues for Telegram/Al-Waseet/media jobs.
3. Redis locks for media quota and stock reservations.
4. Server-side pagination everywhere.
5. Eager load dashboard queries.
6. Add DB indexes for high-volume filters.
7. Add rate limiting to public checkout and billing calculate.
8. Add request IDs and structured logs.
9. Add failed job monitoring.
10. Expand health checks for DB, Redis, queue lag, Bunny, Telegram, and Al-Waseet.
11. Add CSP/security headers.
12. Add webhook secrets.
13. Add sensitive config redaction in errors.
14. Add image resizing and responsive Bunny URLs.
15. Add lazy loading and cache headers for media.
16. Add SQL query performance tests for dashboard.
17. Add CI gates for `tsc`, build, migrations, tests.
18. Add static analysis/Pint/PHPStan if approved.
19. Add per-tenant API rate limits.
20. Add backup/restore documentation.

## Recommended Implementation Order

1. Continue Flutter Dashboard runtime QA against a safe seeded backend user.
2. Configure production push provider env for FCM/APNs and run queue workers for `notifications` and `media`.
3. Set `TELEGRAM_WEBHOOK_SECRET` in every public environment and rerun admin webhook setup.
4. Test environment fix and CI gates.
5. Tenant policies and checkout/security tests.
6. Billing provider handoff and custom-limit audit/history UI.
7. Dashboard pagination and API standardization.
8. Redis queues/cache/rate limits.

## Risk Level

Overall current risk: High until test environment, tenant policy coverage, and billing checkout are complete.
