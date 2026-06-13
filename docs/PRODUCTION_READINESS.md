# Production Readiness

## Health And Observability

- `GET /api/health` checks the Next app and Laravel `/up`.
- `GET /api/health/deep` checks Next and proxies Laravel deep health.
- `GET /api/v1/ops/health` is the lightweight Laravel health endpoint.
- `GET /api/v1/ops/health/deep` checks app boot, database, cache read/write, queue tables, storage, Bunny configuration, and scheduler heartbeat.
- `GET /api/v1/admin/ops/summary` is admin-only and returns failed jobs, pending jobs, recent system events, storage usage, notification failures, Telegram/Bunny failures, tenant/domain failures, and slow analytics counters.
- Admin UI: `/dashboard/ops`.

Health and ops responses never include provider tokens, Bunny API keys, Telegram secrets, Al-Waseet credentials, or raw provider payloads.

## Queues And Scheduler

Run workers for the queues used by the system:

```bash
php artisan queue:work --queue=default,notifications,media,analytics --tries=3 --backoff=120
```

Run the scheduler every minute:

```bash
* * * * * cd /var/www/store/backend && php artisan schedule:run >> /dev/null 2>&1
```

The scheduler writes a heartbeat every five minutes and dispatches daily analytics aggregation at `02:15`.

## Analytics Aggregation

Daily aggregate tables:

- `store_daily_stats`
- `product_daily_stats`
- `notification_daily_stats`
- `platform_daily_stats`

Backfill and retention command:

```bash
php artisan analytics:aggregate-daily --from=2026-06-01 --to=2026-06-13 --retention-days=180
```

The analytics dashboard uses aggregate tables for dated ranges when aggregate rows exist, with raw table fallback during rollout.

## Subscription Enforcement Review

Enforced gates:

- Stores: `stores`
- Products: `products`
- Storage/media: `storage_gb`
- Employees: `employees`
- Telegram: `telegram_bot`
- Custom domain: `custom_domain`
- Al-Waseet: `alwaseet_integration`
- Customer marketing notifications: `customer_notifications`
- Scheduled marketing notifications: `scheduled_notifications`
- Translated notification templates: `notification_templates`

Order creation and order volume remain unlimited. Checkout is not blocked by risk scoring, and system notifications do not count as customer marketing campaigns.

## Security Controls

Public endpoints have throttles for analytics spam, customer notification subscription abuse, domain enumeration, and public order creation. Tenant denials, domain resolution failures, suspicious auth failures, provider failures, and slow analytics requests are logged as sanitized `system_events`.

Uploads remain backend-only. Never expose `BUNNY_API_KEY`, Telegram tokens, Al-Waseet credentials, or provider payload dumps to clients, docs, logs, or health responses.

## Launch Deployment Checklist

Runtime:

- PHP 8.3+ with `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `curl`, `ctype`, `json`, `tokenizer`, and `xml`.
- `pdo_sqlite` if SQLite test runs are used.
- `redis` if Redis backs cache, sessions, queues, or locks.
- Node 22+ and npm 10+ for the current Next app and future Nuxt app.
- Composer 2.

Install and build:

```bash
cd backend
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

```bash
cd /var/www/store
npm ci
npm run build
```

For the Nuxt migration app:

```bash
cd /var/www/store/frontend-nuxt
npm ci
npm run lint
npm run build
npm run dev
```

Queues and scheduler:

- Run `php artisan queue:work --queue=default,notifications,media,analytics --tries=3 --backoff=120` under Supervisor/systemd/PM2.
- Run `php artisan schedule:run` every minute.
- Monitor `failed_jobs`, queue depth, and `/api/v1/admin/ops/summary`.

Redis:

- Configure Redis for cache/queues/sessions before enabling Redis drivers.
- Ensure Redis persistence/eviction policy fits queue and cache use.
- Do not switch queue driver without confirming workers and health checks.

Environment variables:

- Bunny: `BUNNY_STORAGE_ZONE`, `BUNNY_API_KEY`, `BUNNY_PULL_ZONE`, optional `BUNNY_REGION`.
- Telegram: backend-only bot token configuration and `TELEGRAM_WEBHOOK_SECRET` when webhooks are enabled.
- Push: FCM/APNs project, credentials path or JSON, key IDs, team IDs, and bundle IDs as applicable.
- Al-Waseet: encrypted per-store credentials only; no frontend env exposure.
- Cron: `CRON_SECRET` for protected HTTP maintenance routes if they are used.

DNS and SSL:

- Wildcard DNS for storefront subdomains, for example `*.example.com`.
- App/dashboard/API operational hosts must remain reserved and not route to storefront tenants.
- Use wildcard SSL for first-party storefront subdomains.
- Custom domains need a verification flow and SSL issuance strategy before self-service launch. Recommended path: DNS TXT/CNAME verification, mark `domain_verified_at`, then issue certificate through the load balancer or reverse proxy automation.

Nginx/Apache routing:

- Route app/dashboard/API hosts to the frontend app and Laravel API proxy as configured.
- Route storefront wildcard hosts to the frontend SSR process.
- Preserve original `Host` headers so domain resolution works.
- Set upload size/timeouts consistently with Laravel validation.
- Ensure `/api/v1/*` reaches Laravel through the current proxy strategy.

Health checks:

- `GET /api/health`
- `GET /api/health/deep`
- `GET /api/v1/ops/health`
- `GET /api/v1/ops/health/deep`
- Admin review: `/dashboard/ops`

Backups and retention:

- Daily database backup with point-in-time recovery if available.
- Media backup strategy for local uploads and provider storage.
- Test restore regularly.
- Log rotation for Laravel logs, web server logs, queue worker logs, and frontend process logs.
- Prune old failed jobs only after operational review.

Frontend migration:

- Existing production frontend is Next.js. Do not replace it until Nuxt route parity, SEO, auth, dashboard, storefront, and PWA checks pass.
- Nuxt lives in `frontend-nuxt/`, is JavaScript-only, and is not production-facing yet.
- Do not add TypeScript source files under `frontend-nuxt/`; generated `.nuxt` files and dependency files are not source.
- Nuxt local dev must run on port 3001. If port 3001 is busy, stop that process instead of allowing fallback to 3002.
- Storefront proxies must route `/_nuxt/*` assets to the Nuxt server so CSS and JavaScript load on subdomain/custom hosts.
