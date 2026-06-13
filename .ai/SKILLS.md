# Skills

Last updated: 2026-05-02

## Skills.sh Status

`Skills.sh` was not found. No executable project skills were available to extract. Root `SKILL.md` exists but is a placeholder with no concrete rules. Future agents must re-check `Skills.sh` before work and update this file if it appears.

## Backend Skills

- Laravel 13 API development with controllers, resources, models, middleware, services, migrations, seeders, jobs, and tests.
- Sanctum token authentication and refresh-token handling.
- Multi-tenant SaaS backend design using owner/employee inheritance and selected store context.
- Subscription entitlement and pricing logic using features, plans, plan feature rules, usage records, and usage rollups.
- API response standardization: `success`, `data`, `message`, `code`, `errors`, `details`, `upgrade`, `meta`, `pagination`.
- FormRequest validation and authorization/policy-aware controller design are preferred.

## Frontend Skills

- Next.js App Router with React 19 and TypeScript.
- Dashboard and storefront UI built from reusable components under `components/`.
- Radix UI primitives, lucide-react icons, Tailwind CSS, Sonner toasts, Recharts.
- Central API access through `lib/api-client.ts`.
- Read `DESIGN.md` before any UI/UX change and follow it before introducing new visual patterns. The public storefront is light-first unless dark mode is explicitly requested.
- Strict TypeScript; avoid broad `any` and stale DTO drift.
- Storefront should be mobile-first, fast, and conversion-oriented.

## Database Skills

- MySQL schema/migration work through Laravel migrations.
- Important SaaS tables: users, stores, products, orders, plans, features, plan_features, subscriptions, usage tables.
- Preserve foreign keys, indexes, and soft-delete behavior.
- Do not add translated owner-input columns. Canonical merchant content fields only.
- Keep `migrate:fresh --seed` as an acceptance target.

## Infrastructure Skills

- Next.js frontend can run through `npm run dev`, `npm run build`, `npm run start`.
- Laravel backend can run with `php artisan serve`, queues, logs, and tests.
- PM2 config exists in `ecosystem.config.js`.
- `INTERNAL_API_URL` should drive the Next API proxy in production.
- Redis is recommended for cache, locks, queues, rate limits, and usage counters.

## Integrations

- Telegram Bot API: link/setup webhook, product posting, order notifications, callbacks.
- Al-Waseet: store-specific credentials, token cache, cities/regions/package-sizes, order sync, invoice flows.
- Bunny CDN: media uploads can write locally and optionally upload to Bunny.
- Web push: push subscription routes and model exist.

## Telegram Bot Skills

- Validate bot tokens and channels before saving settings.
- Use per-store/tenant context for webhook/order/product actions.
- Gate Telegram features through `telegram_bot` entitlement.
- Do not log secrets or bot tokens.
- Make webhook handling idempotent where possible.

## SaaS Architecture Skills

- Design for tenant isolation first.
- Enforce custom per-user limits before creating scarce SaaS resources such as stores, employees, products, and storage.
- Do not limit orders by SaaS plan or quantity. Orders must remain available unless the store/checkout/product/stock validation blocks them.
- Count usage idempotently for metered features.
- Keep public store checkout server-authoritative.
- Prefer service-layer billing logic over duplicated controller checks.

## Security Rules

- Never expose `.env`, tokens, passwords, API keys, Bunny keys, Telegram tokens, or Al-Waseet credentials.
- Validate ownership of `X-Store-ID`.
- Validate all public checkout products belong to the target store.
- Use FormRequests/policies for sensitive operations.
- Avoid trusting frontend totals, prices, or tenant headers.

## Performance Rules

- Prefer pagination and server-side filtering for dashboard tables.
- Use eager loading to avoid N+1 queries.
- Cache storefront sections by store and invalidate on product/store changes.
- Move heavy jobs to queues.
- Use Redis for high-volume counters and rate limits.

## Preferred Patterns

- Laravel resources for API DTOs.
- `SubscriptionService` for entitlements, pricing, and usage.
- `TenantMiddleware` plus policies/services for tenant access.
- `apiClient` for frontend requests.
- Single canonical owner-input fields.

## Forbidden Patterns

- Do not add translated owner-input fields like `name_ar`, `title_ku`, `descriptionAr`.
- Do not trust client-provided tenant/store ownership.
- Do not calculate order totals on the client as source of truth.
- Do not hardcode backend URLs except local fallback.
- Do not bypass tenant scopes without explicit validation.
- Do not install packages during documentation-only tasks.

## Notes For Future Agents

- `Skills.sh` absent as of this update.
- `php artisan test` currently fails in this environment because SQLite PDO is missing.
- `npx tsc --noEmit` was clean after the previous code update.
- If package or framework versions change, update this file and `.ai/PROJECT_CONTEXT.md`.
