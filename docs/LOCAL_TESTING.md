# Local Testing And Verification

## Required Runtime

- PHP 8.3+
- Composer 2+
- Node 22+
- npm 10+
- MySQL/MariaDB for normal local development, or SQLite for isolated tests

## Required PHP Extensions

- `pdo_mysql` for the normal application database
- `pdo_sqlite` when using `DB_CONNECTION=sqlite` or `DB_DATABASE=:memory:` in tests
- `redis` when Redis is selected for cache, queues, or sessions
- `mbstring`
- `openssl`
- `fileinfo`
- `curl`
- `ctype`
- `json`
- `tokenizer`
- `xml`

## Backend Test Environment

### Option A: SQLite

1. Install and enable the SQLite PDO extension for PHP CLI, usually package `php8.3-sqlite3` or equivalent.
2. Copy `backend/.env.testing.example` to `backend/.env.testing`.
3. Set `APP_KEY` with `php artisan key:generate --env=testing`.
4. Keep `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:`.
5. Run `composer test` or `php artisan test`.

If `pdo_sqlite` is missing, PHPUnit will fail before assertions with `could not find driver`. That is an environment failure, not a passing test run.

### Option B: Dedicated MySQL/PostgreSQL Test Database

1. Create a disposable database, for example `dokani_testing`.
2. Copy `backend/.env.testing.mysql` to `backend/.env.testing`.
3. Set `APP_KEY` with `php artisan key:generate --env=testing`.
4. Set `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
5. Run `php artisan migrate:fresh --env=testing`.
6. Run `composer test` or `php artisan test`.

Never point tests at production or shared staging databases.

## Frontend Verification

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

For the Nuxt migration skeleton:

```bash
cd frontend-nuxt
npm install
npm run lint
npm run build
npm run dev
```

Nuxt local dev server must run on port 3001. If port 3001 is busy, stop the process using it instead of letting Nuxt move to 3002.

```bash
lsof -i :3001
kill -9 <PID>
```

For this repository, port 3001 may be occupied by the old Next `storify-store` PM2 process. Stop it before running Nuxt on the real store host:

```bash
pm2 stop storify-store
cd frontend-nuxt
npm run dev
```

Confirm the Nuxt source remains JavaScript-only:

```bash
find frontend-nuxt -path 'frontend-nuxt/node_modules' -prune -o -path 'frontend-nuxt/.nuxt' -prune -o -path 'frontend-nuxt/.output' -prune -o -type f \( -name '*.ts' -o -name '*.tsx' \) -print
```

## Nuxt Store Host Asset Verification

Manual browser checks:

- Open the real store host, for example `https://teststore.blackt.uk`.
- Inspect the Network tab.
- Confirm `/_nuxt/*.css` returns `200`.
- Confirm `/_nuxt/*.js` returns `200`.
- Confirm there are no CSS MIME-type errors.
- Confirm there are no `404` responses for Nuxt assets.
- Confirm the page HTML is from Nuxt and not the old Next app; old Next responses include `/_next/*` assets and `x-powered-by: Next.js`.

Do not report tests or lint as passing unless these commands complete successfully in the current environment.

## Backend Verification

```bash
cd backend
composer validate
php artisan route:list --path=api/v1 --no-ansi
php artisan migrate --pretend --no-ansi
php artisan test
```
