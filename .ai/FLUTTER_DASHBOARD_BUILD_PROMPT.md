# Flutter Dashboard Build Prompt

Last updated: 2026-05-11

Implementation note 2026-05-11: the separate Flutter Dashboard app has been built in this Flutter project. See `.ai/FLUTTER_DASHBOARD_API_AUDIT.md` for implementation status, APIs wired, checks run, and remaining backend/runtime blockers. Future work should continue from the existing Flutter `lib/` app instead of generating a second dashboard client.

Copy the prompt below into a future Codex run when the project is ready to build the separate Flutter Dashboard app.

```text
You are a senior Flutter engineer, SaaS dashboard architect, Laravel/PHP API integration engineer, UI/UX engineer, i18n engineer, notification engineer, and API contract auditor.

Your task is to build a new Flutter Dashboard app for Storify.

Do not replace the public storefront.
Do not rewrite the Laravel backend.
Do not modify the current Next.js storefront/dashboard unless explicitly required for integration.
Build the Flutter Dashboard as a separate app/client that consumes the existing Laravel `/api/v1` APIs.

==================================================
READ FIRST
==================================================

Before editing or generating app code, read:

- DESIGN.md
- Skills.sh if it exists
- .ai/PROJECT_CONTEXT.md
- .ai/SKILLS.md
- .ai/FILE_INDEX.md
- .ai/FEATURE_MAP.md
- .ai/API_MAP.md
- .ai/DATABASE_MAP.md
- .ai/BUGS_AND_RISKS.md
- .ai/NEXT_ACTIONS.md
- .ai/AGENT_RULES.md
- .ai/CHANGELOG_AI.md
- .ai/FLUTTER_DASHBOARD_API_AUDIT.md

Use `.ai/FLUTTER_DASHBOARD_API_AUDIT.md` as the primary API contract for Flutter. If real code disagrees with the audit, trust the real code and update the audit before proceeding.

==================================================
PROJECT FACTS
==================================================

- Backend is Laravel 13, PHP 8.3+, Sanctum, `/api/v1`.
- Current web frontend is Next.js 16, React 19, TypeScript, Tailwind CSS.
- The public storefront remains the existing web storefront under `app/store/[slug]/*`.
- The new Flutter Dashboard is for store owners, platform admins, and supported employee users.
- Roles are `admin`, `store_owner`, `employee`.
- Store owners can have multiple stores.
- Employees inherit the store owner tenant through `parent_id`.
- Store owners and employees use one main Store Selector after authentication.
- The backend validates selected store ownership through `X-Store-ID`.
- Store owner Telegram bot token must never be exposed. The platform-managed Telegram bot token lives on the backend.
- Orders have no SaaS order limits. Do not add order-limit UI or blocking logic.
- SaaS admins manage custom per-user limits/pricing.

==================================================
STRICT RULES
==================================================

- Build Flutter Dashboard only.
- Do not build or replace the public storefront.
- Do not rewrite backend business logic.
- Do not depend on missing APIs without documenting backend prerequisites.
- Do not invent API behavior. If an endpoint is missing, mark it as missing and create a backend prerequisite note.
- Do not expose secrets, tokens, `.env`, Telegram bot token, Al-Waseet credentials, or API keys.
- Backend is source of truth for auth, tenant ownership, limits, totals, and permissions.
- Flutter must not trust local `storeId`.
- Flutter must validate selected store against authenticated stores before using it.
- Flutter must clear invalid selected store state on tenant errors.
- Use canonical merchant fields only. Do not create translated merchant input fields such as `name_ar`, `title_ku`, or `description_ar`.
- All visible Flutter strings must be localized.

==================================================
BACKEND/API RULES
==================================================

Base API path: `/api/v1`.

Implement a Flutter API client that supports:

- Base URL configuration by environment.
- JSON requests and multipart uploads.
- `Authorization: Bearer <accessToken>`.
- `Accept: application/json`.
- `Accept-Language`.
- Optional `X-Store-ID`, only when authenticated selected store is valid.
- Token refresh through `POST /auth/refresh`.
- Logout through `POST /auth/logout`.
- Normalization of inconsistent response envelopes:
  - `{ success, data, message }`
  - bare Laravel resource collections `{ data: [...] }`
  - wrapped paginated collections `{ success, data: { data, links, meta } }`
  - error payloads with either `error`, `message`, `errors`, `code`.

Critical existing APIs:

- Auth: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/user`, `POST /auth/logout`, `POST /auth/logout-all`.
- Profile: `PATCH /profile`, `PATCH /profile/password`.
- Dashboard bootstrap: `GET /dashboard/init`.
- Stores: `GET/POST /stores`, `GET/PATCH/DELETE /stores/{store}`.
- Products: `GET/POST /products`, `GET/PATCH/DELETE /products/{product}`, `POST /products/{product}/telegram`.
- Product types: `/product-types` resource.
- Categories: `/categories` resource.
- Orders: `GET/POST /orders`, `GET/PATCH/DELETE /orders/{order}`, `PATCH /orders/{order}/status`.
- Buyers: `GET/POST /buyers`, `GET /buyers/{buyer}`.
- Billing: `GET /billing/current`, `GET /billing/usage`, `POST /billing/calculate`, `POST /billing/checkout-session`.
- Admin: `/admin/users`, `/admin/users/{user}/limits`, `/admin/plans`, `/admin/features`, `/admin/subscriptions`, `/admin/settings`.
- Media: `GET /media`, `POST /media`.
- Telegram: `POST /telegram/link-bot`, `POST /stores/telegram/validate-channel`, `POST /products/{product}/telegram`.
- Push/web notifications: `POST /push/subscribe`, `POST /push/unsubscribe` are web-push only, not FCM.

Backend readiness update from 2026-05-10:

- Store status/settings endpoints are available.
- Telegram settings/test endpoint is available and never accepts or returns the bot token.
- Notification polling/read APIs are available.
- Realtime `private-store.{id}` channel authorization is fixed.
- FCM/APNs-style device-token registration is available, but push sending is still a backend future task.
- Buyer update/blacklist endpoints are available.
- `/billing/current` includes custom limits/usage/pricing and no order limits.
- Admin broadcast endpoint is available.
- Media delete/replace endpoints are available.
- `/telegram/setup-webhook` is admin-gated.

Known backend prerequisites before full feature completion:

- Add push notification sender/worker before depending on device tokens for actual mobile push delivery.
- Implement or formally remove `/buyers/auth` after buyer-account auth requirements are defined. It is not required for Flutter Dashboard.
- Add Telegram webhook signature/secret hardening before high-risk public webhook exposure.
- Add Bunny remote delete/replace cleanup or media cleanup job if strict CDN cleanup is required.

Document any backend prerequisite you encounter in:

- .ai/FLUTTER_DASHBOARD_API_AUDIT.md
- .ai/API_MAP.md
- .ai/NEXT_ACTIONS.md
- .ai/BUGS_AND_RISKS.md
- .ai/CHANGELOG_AI.md

==================================================
FLUTTER APP ARCHITECTURE
==================================================

Recommended stack:

- Flutter stable.
- Riverpod or Bloc for state management. Prefer Riverpod unless the repo already has a Flutter convention.
- Dio or package:http for API. Prefer Dio for interceptors, token refresh, multipart upload, and cancellation.
- flutter_secure_storage for tokens on mobile; secure browser-compatible storage strategy for Flutter Web.
- go_router for navigation and role guards.
- freezed/json_serializable for models if packages are already approved; otherwise use hand-written models initially.
- intl/flutter_localizations for i18n.

Recommended folder structure:

```text
flutter_dashboard/
  lib/
    main.dart
    app/
      app.dart
      router.dart
      bootstrap.dart
    core/
      api/
        api_client.dart
        api_error.dart
        api_response.dart
        token_refresh_interceptor.dart
      auth/
        secure_token_store.dart
        auth_session.dart
      config/
        app_config.dart
      errors/
        failure.dart
      localization/
        app_localizations.dart
      theme/
        app_theme.dart
      widgets/
        app_shell.dart
        loading_state.dart
        empty_state.dart
        error_state.dart
        confirm_dialog.dart
    features/
      auth/
        data/
        domain/
        presentation/
      dashboard_home/
      stores/
      store_selector/
      products/
      categories/
      orders/
      buyers/
      store_settings/
      telegram/
      notifications/
      billing/
      admin/
      media/
```

State boundaries:

- Auth state: current user, access token, refresh token, auth bootstrap status.
- Selected store state: accessible stores, selected store id, selected store object, validation error.
- Dashboard state: bootstrap data, loading/error, refresh.
- Feature state: products, categories, orders, buyers, settings, billing/admin.

Data access pattern:

- Models should mirror Laravel resources from `.ai/FLUTTER_DASHBOARD_API_AUDIT.md`.
- Repositories wrap API endpoints and return typed results/failures.
- Feature controllers/providers call repositories and own loading/error state.
- Widgets never call HTTP directly.
- All mutations should refetch or update cache consistently after success.

==================================================
REQUIRED PAGES
==================================================

Build pages incrementally. Do not stub a page as complete unless it performs its real workflow.

Auth:

- Login.
- Optional session expired/re-login screen.

Core dashboard:

- Dashboard Home.
- Store Selector.
- Store List/Create Store.

Catalog:

- Products list.
- Product details.
- Product create/edit.
- Product media.
- Product options/variants.
- Product active/inactive.
- Product Telegram post action if store/channel/feature allow.
- Product types/category groups.
- Categories/sub-categories.

Orders/customers:

- Orders list.
- Order details.
- Order status update.
- Customer/buyer details.
- Buyer risk/blacklist display. Do not implement blacklist mutation until backend endpoint exists.

Store settings:

- General profile: name, slug, WhatsApp/contact, description.
- Branding: logoUrl, coverUrl, media upload.
- Social media accounts.
- Store language/status only if backend supports it.

Telegram:

- Telegram Settings for selected store.
- Link private user/group/channel through `POST /telegram/link-bot`.
- Notification toggles through store update where supported.
- Show "bot token is platform managed" as informational UI only.
- Do not expose bot token input.
- Do not expose setup webhook to non-admin.

Notifications:

- If realtime is fixed: subscribe to store channel and update order notifications.
- If not fixed: use polling fallback for pending orders.
- Prepare push architecture but do not implement FCM without backend token registration.

Billing/limits:

- Store owner Limits/Pricing view from `/billing/current` and `/billing/usage`.
- Show custom limits only if backend exposes them.
- Upgrade/contact support flow using settings `saas_contact_whatsapp` where available.

Admin:

- Admin dashboard home.
- Admin users.
- Admin create/edit store owner with custom limits/pricing.
- Admin user limits editor.
- Admin plans/features/subscriptions if APIs are supported.
- Admin settings.
- Do not build admin API key management or broadcast as production features until backend endpoints exist.

Employee:

- Employees can access products and product types/categories only.
- Hide or block orders, buyers, stores, billing, settings, admin.

==================================================
STORE SELECTOR RULES
==================================================

After login:

1. Load authenticated user.
2. Load `/dashboard/init` or `/stores` without `X-Store-ID`.
3. Build accessible stores from server response.
4. If a stored selected store id exists, validate it against accessible stores.
5. If valid, select it.
6. If invalid, clear it.
7. For store owners/employees, auto-select the first active accessible store if no valid selected store exists.
8. For admins, allow all-store context with no selected store.
9. After `POST /stores`, select the returned store automatically.
10. Never send `X-Store-ID` until the selected id is validated.

On API errors:

- `TENANT_ACCESS_DENIED`: clear selected store and reload accessible stores.
- `UNAUTHENTICATED_TENANT`: clear selected store; if auth is invalid, refresh or logout.
- `PLAN_LIMIT_REACHED`: show upgrade/limit UI.
- `FEATURE_DISABLED`: show locked feature UI.

==================================================
UI/UX REQUIREMENTS
==================================================

Follow `DESIGN.md`.

For the Flutter Dashboard, use a clean SaaS dashboard experience:

- Responsive desktop web first, with tablet/mobile support.
- Sidebar navigation on desktop.
- Bottom navigation or drawer on narrow mobile if needed.
- Top bar with selected store, search where useful, notifications, language, account menu.
- Data-dense but calm operational layouts.
- Cards only for individual repeated items, metrics, dialogs, and framed tools.
- Tables/lists with filters, search, sort where API supports it.
- Forms with validation, save states, disabled states, and backend error display.
- Loading states, empty states, error states, confirmation dialogs.
- No decorative marketing landing page.
- Do not use giant hero marketing sections inside the dashboard.
- Avoid hardcoded visible strings.
- Use accessible touch targets and clear focus states.
- Support RTL for Arabic and Kurdish.

Flutter theme guidance:

- Use restrained SaaS dashboard styling.
- Respect the Shopify-inspired quality bar in `DESIGN.md`, but adapt it to a dashboard surface.
- Keep public storefront design separate from dashboard design.
- Avoid one-note palettes.
- Avoid exposing implementation instructions or feature descriptions as in-app copy.

==================================================
I18N REQUIREMENTS
==================================================

- Supported languages: English (`en`), Arabic (`ar`), Kurdish (`ku`) if the project continues all three.
- No hardcoded user-visible strings in widgets.
- Use generated localizations or a single localization service.
- Arabic and Kurdish are RTL.
- Merchant-entered content remains canonical and is not duplicated by language.
- Locale files must include dashboard, auth, products, orders, stores, Telegram, billing, admin, validation, errors, empty states.

==================================================
SECURITY REQUIREMENTS
==================================================

- Store access tokens and refresh tokens securely.
- On mobile, use secure storage/keychain/keystore.
- On Flutter Web, document the residual storage risk and prefer the safest available approach.
- Never log tokens, secrets, passwords, Telegram token, or Al-Waseet credentials.
- Do not print `.env`.
- Do not trust frontend totals, prices, or selected store id.
- Backend is source of truth for permissions, tenant validation, subscription limits, order totals, and stock.
- Never expose Telegram bot token to store owners.
- Do not add order limits.
- On password update success (`SESSION_REVOKED`), clear tokens and send user to login.

==================================================
IMPLEMENTATION PHASES
==================================================

Phase 1: Flutter app shell

- Create Flutter app structure.
- Add theme, routing, localization scaffolding.
- Add responsive dashboard shell.
- Add shared widgets for loading/empty/error/confirm states.

Phase 2: Auth

- Implement login.
- Implement secure token storage.
- Implement auth bootstrap.
- Implement refresh token flow.
- Implement logout.
- Implement profile/password flows if needed.

Phase 3: API client

- Implement normalized response parser.
- Implement Dio/http client with auth headers.
- Implement token refresh interceptor.
- Implement tenant header injection only after selected store validation.
- Implement typed API errors.

Phase 4: Store selector

- Load stores from `/dashboard/init` or `/stores`.
- Validate selected store.
- Persist selected store safely.
- Auto-select first active store for owners/employees.
- Allow admin all-store context.
- After create store, select new store.

Phase 5: Dashboard home

- Use `/dashboard/init`.
- Show role-aware metrics and quick actions.
- Show selected store context.
- For employees, show catalog-only dashboard.

Phase 6: Products

- List/filter products.
- Create/edit product.
- Upload media.
- Manage options/variants.
- Toggle active/inactive via product update.
- Telegram post action only if safe.

Phase 7: Categories

- Product types/category groups.
- Categories/sub-categories.
- Global read-only rows for non-admin.
- Employee create/update but no delete.

Phase 8: Orders

- List/filter orders.
- Details.
- Update status.
- Update editable order fields where API supports it.
- No order limits.

Phase 9: Store profile/settings/social

- General store edit using `PATCH /stores/{store}`.
- Branding upload through `POST /media` then store update.
- Social media fields.
- Mark unsupported fields as backend prerequisites.

Phase 10: Telegram settings

- Link user/group/channel with `POST /telegram/link-bot`.
- Save notification toggles and ids through store update where supported.
- Validate channel.
- Do not expose bot token.
- Mark test notification/thread id as backend prerequisites.

Phase 11: Notifications

- Implement polling fallback from orders if notification API/realtime is not ready.
- If backend realtime is fixed, subscribe to selected store order events.
- Prepare device token architecture only after backend FCM/APNs endpoint exists.

Phase 12: Limits/pricing

- Store owner billing current/usage view.
- Admin users/custom limits/pricing editor.
- Admin plan/features/subscriptions if required.
- Do not add order limit fields.

Phase 13: Polish/testing

- Responsive QA for desktop/tablet/mobile.
- RTL QA for Arabic/Kurdish.
- Empty/error/loading states.
- Form validation.
- API smoke tests.
- `flutter analyze`.
- `flutter test`.
- `flutter build web`.

==================================================
TESTING AND CHECKS
==================================================

Before final response, run where available:

- `flutter analyze`
- `flutter test`
- `flutter build web`
- Locale generation check
- API smoke tests for login, dashboard init, store list, product list, order list if credentials/test user are available

If a check cannot run, explain the exact blocker. Do not claim checks passed if they did not run.

==================================================
OUTPUT FORMAT FOR THAT FUTURE BUILD TASK
==================================================

At the end, report:

1. Flutter app location and files created.
2. Pages implemented.
3. APIs used.
4. API gaps/prerequisites found.
5. Security decisions.
6. Localization status.
7. Checks run and results.
8. Remaining next tasks.

Keep the final summary concise. Do not print secrets. Do not print the whole prompt.
```
