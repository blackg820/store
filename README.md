# Storify — SaaS Multi-Store Order Management System

A production-ready, admin-controlled, multi-tenant SaaS platform for managing
multiple online stores, orders, buyers, and subscriptions. REST API-first with
JWT authentication, ready for Flutter / React Native / native mobile apps.

## Features

### Core Platform
- Multi-tenant architecture with strict user isolation
- Admin-controlled user creation (no public registration)
- Two account modes: `controlled` (subscription-based) and `unlimited`
- Full Arabic / English support with automatic RTL/LTR switching
- Bootstrap mobile-first responsive dashboards

### Subscription System
- Built-in plans: Starter ($10/mo), Pro ($25/mo), Business ($50/mo), Enterprise
- Strict limit enforcement per plan (stores, products, storage)
- 7-day grace period before media deletion on expiry
- Upsells: extra stores, extra storage, white label, analytics pack, priority alerts

### Dynamic Catalog
- Product Types with schema-validated custom fields
- Nested Categories (tree structure, unlimited depth)
- Custom field types: text, number, select, multi-select, boolean, date
- Runtime validation against product type schema

### Orders & Buyers
- Full order lifecycle: pending → confirmed → delivered → returned → problematic
- Anti-duplicate protection (same phone + product + 24h window)
- Buyer risk scoring (low/medium/high) based on rejection rate
- Phone number blacklist
- Internal notes and full audit trail per order

### Discounts
- Per-product discounts with optional end dates
- Store-wide global discounts
- Non-stacking logic (uses larger of two discounts)

### Media (Bunny.net CDN)
- Three visibility levels: `public`, `private`, `restricted`
- Signed URL generation for time-limited access
- Blur hash previews for restricted content
- Storage quota enforcement per plan
- Auto-cleanup cron for expired subscriptions

### Telegram Integration
- Bot API integration (no AI)
- Secure token-based linking for user/group setup
- Notifications: new orders, status changes, high-risk alerts
- Bilingual message templates

### Security
- bcrypt password hashing (12 rounds)
- JWT access + refresh token auth
- In-memory rate limiting (swap to Upstash Redis for production)
- Input validation with normalized phone numbers
- Full audit logging (users, stores, products, orders, subscriptions)
- RBAC: admin / store_owner roles
- SQL injection prevention via parameterized queries (prepared for PDO migration)

### REST API
Versioned at `/api/v1`:
- `POST /api/v1/auth/login` / `/refresh`
- `GET|POST /api/v1/stores`
- `GET|POST /api/v1/products`
- `GET|POST /api/v1/orders` / `PATCH /api/v1/orders/[id]/status`
- `GET /api/v1/buyers` (lookup by phone)
- `GET /api/v1/analytics`
- `GET /api/v1/media/[id]` (signed URL delivery)
- `GET /api/v1/docs` (full API documentation)

Public endpoints:
- `POST /api/public/orders` — Rate-limited customer order submission
- `GET /api/health` — Health check for monitoring
- `POST /api/telegram/webhook` — Telegram bot updates
- `GET /api/cron/cleanup` — Scheduled cleanup (requires CRON_SECRET)

## Getting Started

### Demo Credentials
- **Admin**: `admin@storify.com` / `demo123`
- **Store Owner (Controlled)**: `ahmed@example.com` / `demo123`
- **Store Owner (Unlimited)**: `sara@example.com` / `demo123`

### Development
```bash
pnpm install
pnpm dev
```

### Production Setup

1. **Copy environment template** and fill in production values:
   ```bash
   cp .env.example .env.local
   ```

2. **Provision database** (Neon, Supabase, or Amazon Aurora recommended):
   ```bash
   # Run the SQL schema
   psql $DATABASE_URL < scripts/001-schema.sql
   ```

3. **Replace mock data layer** with real database calls:
   - Replace `lib/mock-data.ts` imports in `lib/data-context.tsx`
   - Wire each operation (e.g. `addOrder`) to the database
   - Replace in-memory rate limiter (`lib/rate-limit.ts`) with Upstash Redis

4. **Configure integrations**:
   - Create Bunny.net Storage Zone and Pull Zone
   - Create Telegram bot via @BotFather
   - Register Telegram webhook:
     ```
     https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/telegram/webhook
     ```

5. **Deploy to Vercel**:
   ```bash
   vercel deploy --prod
   ```

6. **Register cron** (already configured in `vercel.json`):
   - Runs daily at 02:00 UTC
   - Cleans expired sessions, suspended subscriptions, flagged media after 7-day grace

## Architecture

```
app/
  api/
    v1/              # Versioned REST API (mobile-ready)
    public/          # Public endpoints (rate-limited)
    cron/            # Scheduled jobs
    telegram/        # Bot webhook + linking
  dashboard/         # Admin & store owner dashboards
  store/[slug]/      # Public storefront
components/
  dashboard/         # Dashboard components
  auth/              # Route guards
  ui/                # shadcn/ui components
lib/
  types.ts           # TypeScript types & enums
  mock-data.ts       # Seed data (replace in production)
  data-context.tsx   # Data layer (replace with DB in production)
  auth-context.tsx   # Authentication state
  jwt.ts             # Token generation/verification
  password.ts        # bcrypt hashing + API key generation
  rate-limit.ts      # Request throttling
  bunny-cdn.ts       # Media storage integration
  telegram.ts        # Bot notifications
  order-utils.ts     # Phone validation, duplicate check, store ranking
  export-utils.ts    # CSV generation with RTL-safe BOM
  api-keys.ts        # Hashed API key management
scripts/
  001-schema.sql     # Production MySQL / PostgreSQL schema
```

## Tech Stack
- **Runtime**: Next.js 16 (App Router) on Node.js 20+
- **UI**: Tailwind CSS v4 + shadcn/ui + Recharts
- **Fonts**: Geist Sans / Mono + Cairo (Arabic)
- **Auth**: JWT (access + refresh) with bcrypt
- **Validation**: Zod-style inline validators
- **Icons**: Lucide React
- **Toasts**: Sonner

## License
Proprietary. All rights reserved.
