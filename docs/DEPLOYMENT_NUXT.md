# Nuxt Deployment Notes

Nuxt is currently a migration app in `frontend-nuxt/`. Deploy it only after parity is confirmed.

## Runtime

- Node 22+ and npm 10+.
- Laravel API available at `/api/v1` through the same origin or configured base URLs.
- Wildcard DNS and SSL for storefront subdomains.
- Custom-domain SSL and verification handled outside the Nuxt app before self-service launch.

## Environment

Configure these for Nuxt:

```bash
NUXT_PUBLIC_API_BASE_URL=https://example.com
NUXT_INTERNAL_API_BASE_URL=http://127.0.0.1:8000
NUXT_PUBLIC_ROOT_DOMAIN=example.com
NUXT_PUBLIC_DASHBOARD_HOST=dashboard.example.com
NUXT_PUBLIC_USE_SUBDOMAINS=true
```

Do not put provider secrets in Nuxt env. Bunny, Telegram, Al-Waseet, push private keys, and provider payloads stay backend-only.

## Build

```bash
cd frontend-nuxt
npm ci
npm run lint
npm run build
PORT=3001 node .output/server/index.mjs
```

Use a process manager such as systemd, PM2, or Supervisor for the Nuxt server.

Nuxt local dev server must run on port 3001:

```bash
cd frontend-nuxt
npm run dev
```

If port 3001 is busy, stop the process using it instead of letting Nuxt move to 3002:

```bash
lsof -i :3001
kill -9 <PID>
```

## Reverse Proxy

- Preserve the original `Host` header so `/api/v1/public/domain/resolve?host=...` can resolve tenants.
- Route `/api/v1/*` to Laravel.
- Route `/_nuxt/*` to the Nuxt server on port 3001.
- Route dashboard/app hosts and storefront wildcard/custom domains to Nuxt SSR after cutover.
- Keep operational hosts reserved and out of storefront tenant resolution.

For Apache-style proxying during migration:

```apache
ProxyPreserveHost On
ProxyPass /_nuxt/ http://127.0.0.1:3001/_nuxt/
ProxyPassReverse /_nuxt/ http://127.0.0.1:3001/_nuxt/
ProxyPass / http://127.0.0.1:3001/
ProxyPassReverse / http://127.0.0.1:3001/
```

Asset verification:

```bash
curl -I https://teststore.blackt.uk/
curl -I https://teststore.blackt.uk/_nuxt/
```

The storefront HTML should reference `/_nuxt/` assets. In the browser Network tab, `/_nuxt/*.css` and `/_nuxt/*.js` must return `200` with no MIME-type errors.

## Storefront i18n

- Supported storefront UI locales are English (`en`), Arabic (`ar`), and Kurdish (`ku`).
- Nuxt uses a no-prefix i18n route strategy for storefront hosts. Public URLs stay as `/`, `/products/{slug}`, and `/categories/{slug}` on the resolved host; do not proxy or redirect storefront traffic to `/en`, `/ar`, or `/ku`.
- Locale priority is explicit user selection, Laravel store `default_language`/`defaultLanguage`, supported browser language, then English.
- The selected user locale is persisted in `dokani_locale` with source marker `dokani_locale_source=user`. Store defaults may set the active cookie but do not override a user-selected locale.
- `<html lang>` and `<html dir>` are controlled by Nuxt. English renders `ltr`; Arabic and Kurdish render `rtl`.
- Deployment smoke checks should confirm that changing EN/AR/KU updates text and direction without changing the route or breaking `/_nuxt/*` asset loading.

## Cutover Gate

Do not remove or disable the current Next frontend until:

- Nuxt storefront host routing, SEO, cart, checkout, product detail, and category flows match production behavior.
- Nuxt dashboard auth, selected-store validation, products, orders, stores, settings, admin, and notifications match production behavior.
- `npm run lint` and `npm run build` pass in `frontend-nuxt/`.
- Root Next verification still passes immediately before cutover.
- Backend route, migration pretend, and available feature tests pass.
