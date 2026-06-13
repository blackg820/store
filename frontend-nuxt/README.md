# Dokani Nuxt Frontend Skeleton

This is a separate Nuxt migration target. It does not replace the existing production Next.js frontend.

## Commands

```bash
npm install
npm run lint
npm run build
npm run dev
```

This Nuxt source tree is JavaScript-only. Use `.js` and `.vue` files; do not add `.ts` or `.tsx` source files under `frontend-nuxt/`.

Nuxt local dev server must run on port 3001. If port 3001 is busy, stop the process using it instead of letting Nuxt move to 3002.

```bash
lsof -i :3001
kill -9 <PID>
```

The root route is a host-routing proof of concept. It reads the request host server-side, calls Laravel `/api/v1/public/domain/resolve`, stores the resolved tenant in Pinia, and renders a store-not-found state when Laravel cannot resolve the host.

## Store Host Asset Check

When testing `teststore.blackt.uk`, the real host must serve Nuxt assets:

```bash
curl -I https://teststore.blackt.uk/
curl -I https://teststore.blackt.uk/_nuxt/
```

The HTML should reference `/_nuxt/` assets, not `/_next/`. In the browser Network tab, confirm `/_nuxt/*.css` and `/_nuxt/*.js` return `200` with no MIME-type errors.
