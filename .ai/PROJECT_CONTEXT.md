# Project Context

Last updated: 2026-05-04

## Project Overview

Storify is a multi-tenant SaaS commerce platform. It combines a Next.js storefront/dashboard frontend with a Laravel API backend. The platform supports store owners, employees, platform admins, public storefronts, products, orders, media uploads, Telegram notifications, Al-Waseet delivery/logistics integration, and a dynamic subscription/pricing system.

This `.ai` folder is the permanent AI memory for the project. Future agents should read these files before scanning the full repository.

## SaaS Goal

Build a production-grade, scalable SaaS platform for store owners with:

- Multi-tenant store isolation.
- Dynamic per-user SaaS limits, feature limits, and usage pricing.
- Storefront conversion UX.
- Admin plan builder and platform administration.
- Integrations for Telegram, Bunny CDN, and Al-Waseet logistics.
- Clean, secure APIs for 100K+ user scale.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript 5.7, Tailwind CSS 4, Radix UI, lucide-react, Recharts, Sonner.
- Backend: PHP 8.3, Laravel 13, Sanctum, Reverb, PHPUnit.
- Database: MySQL in live/dev environment. SQLite test config exists but local PHP lacks SQLite PDO.
- Cache/queues: Laravel cache/jobs tables currently present; Redis is recommended and PHP Redis extension appears available.
- Integrations: Telegram Bot API services, Al-Waseet Merchant API, Bunny CDN upload support, Web Push.
- Deployment hints: PM2 ecosystem config and Next API proxy exist.

## Skills From Skills.sh

`Skills.sh` was not found on 2026-05-02. Root `SKILL.md` exists but is only a placeholder and contains no actionable project rules.

If `Skills.sh` is added later, future agents must read it first and merge its rules into:

- `.ai/PROJECT_CONTEXT.md`
- `.ai/SKILLS.md`
- `.ai/FEATURE_MAP.md`
- `.ai/AGENT_RULES.md`

## Architecture Overview

- `app/` contains Next.js App Router pages, public storefront routes, dashboard pages, and the API proxy route.
- `components/` contains dashboard, store, auth, and reusable UI components.
- `lib/` contains API client, auth/data/cart contexts, utility modules, legacy Next-side data/storage/queue helpers, and shared TypeScript types.
- `backend/` contains the Laravel API, models, migrations, resources, middleware, services, jobs, and tests.
- `backend/routes/api.php` is the primary public API contract under `/api/v1`.
- `app/api/v1/[...path]/route.ts` proxies frontend API calls to Laravel using `INTERNAL_API_URL` or fallback localhost.

## Main Modules

- Auth: Laravel Sanctum login/refresh/user endpoints and frontend auth context.
- Dashboard: initialization, analytics, stores, products, orders, buyers, users, subscriptions, billing, settings, integrations.
- Storefront: public store data, product details, cart drawer, guest checkout.
- Catalog: product types, categories, products, options, variants, media.
- Orders: admin/store-owner order management plus public checkout.
- Billing: features, plans, plan feature rules, subscriptions, usage records, pricing calculator.
- Tenancy: selected store header, owner/employee inheritance, tenant model scopes.
- Integrations: Telegram, Al-Waseet, Bunny CDN, push notifications.
- Operations: Next health endpoint plus protected cron/worker bridges backed by Laravel artisan commands.

## Business Rules

- Tenant root is the store owner user. Employees inherit their parent owner tenant.
- Platform admins can access/administer global data.
- Store owners own one or more stores, subject to subscription limits, and use one main dashboard Store Selector for the active/current store.
- Employees can operate within owner tenant access but should not manage employees or create stores.
- Storefront checkout is guest-first and server calculates totals.
- Orders must never be blocked by SaaS limits or plans. Orders depend only on store availability, buyer/cart validation, product ownership, and stock.
- Store owner input fields are canonical only. Do not add translated owner-entered columns like `name_ar`, `title_ku`, `descriptionAr`, etc.

## Multi-Tenant Logic

- `TenantMiddleware` resolves `X-Store-ID` only after authentication and ownership validation.
- Public store routes use slug/store id and should validate store status and owner status.
- `HasTenant` and `UserOwned` traits apply scopes in some models.
- Selected store must always belong to authenticated admin/owner/employee tenant.
- Store selection must happen only after authentication and dashboard store data are known. Persisted selected store ids must be validated against stores accessible to the current account before use.
- Public checkout must verify every product belongs to the target store and is active/public before creating an order.

## Subscription And Limits Logic

Canonical feature codes:

- `storage_gb`
- `stores`
- `employees`
- `products`
- `api_requests`
- `telegram_bot`
- `alwaseet_integration`
- `custom_domain`
- `premium_support`

Core billing files:

- `backend/app/Services/SubscriptionService.php`
- `backend/app/Http/Controllers/Api/BillingController.php`
- `backend/app/Http/Controllers/Api/AdminController.php`
- `backend/database/seeders/SubscriptionSeeder.php`
- billing migrations from `2026_05_02_*`

Order limits are intentionally disabled. A legacy `orders_per_month` feature may exist in old databases, but `SubscriptionService` treats it as non-blocking. Enforcement exists or is intended at store creation, employee creation, product creation, media upload quota, API request counting, Telegram feature gates, and Al-Waseet feature gates.

Custom per-user limits live in `user_limits`:

- `limits`: `max_stores`, `max_products`, `max_employees`, `storage_gb`, `telegram_bots`, `integrations_count`, `custom_domains`.
- `pricing`: `price_per_store`, `price_per_product`, `price_per_employee`, `price_per_storage_gb`, `price_per_telegram_bot`, `price_per_integration`, `price_per_custom_domain`.
- `total_price_cents` is calculated from base price plus limit quantity times unit prices.
- `max_stores` controls store creation. Store owners cannot edit their own limits/pricing; admins assign them. Orders have no plan/order limits.

## Permissions And Roles

- `admin`: platform admin, uses `can:admin` routes and bypasses many subscription limits.
- `store_owner`: tenant owner account.
- `employee`: child user via `parent_id`, inherits tenant owner access.
- Some legacy role/mode fields still exist: `mode`, `subscription_plan`, `status`.

## Important Constraints

- Do not expose `.env` values or secrets.
- Do not add translated owner-input fields. UI labels may be translated, but merchant-entered catalog/store values are single canonical values.
- Use `/api/v1/*` as the public API contract.
- Use `/api/health` for external uptime checks; protect `/api/cron/*` with `CRON_SECRET`.
- Prefer Laravel backend as source of truth; Next-side MySQL/queue/storage helpers are legacy or should be quarantined.
- Keep tenant isolation and subscription enforcement in every related change.
- Avoid whole-project scans when `.ai` docs answer the task.

## Coding Conventions

- Backend: Laravel controllers/resources/models/services, FormRequests for validation when practical, standard JSON shape.
- Frontend: strict TypeScript, React hooks/context, componentized dashboard/store UI, API client in `lib/api-client.ts`.
- UI: read `DESIGN.md` before any UI/UX change and use it as the primary design reference; public storefront pages are light-first unless dark mode is explicitly requested; use existing Radix/lucide/Tailwind components; avoid broad redesign unless requested.
- Docs: update `.ai` files after meaningful changes.

## Future AI-Agent Notes

- Read `.ai/AGENT_RULES.md` before editing.
- Read the related feature section in `.ai/FEATURE_MAP.md`.
- Use `.ai/FILE_INDEX.md` to locate files instead of scanning everything.
- Always consider tenant, role, validation, subscription, and public API compatibility.
- After code changes, append `.ai/CHANGELOG_AI.md`.
