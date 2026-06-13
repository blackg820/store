# Agent Rules

Last updated: 2026-05-10

## Required Reading Before Editing

1. For any UI/UX change, always read `DESIGN.md` first and use it as the primary design reference. Apply the project implementation override in `DESIGN.md`; the public storefront is light-first unless a task explicitly asks for dark mode.
2. Always read `Skills.sh` first if it exists.
3. Always read `.ai/PROJECT_CONTEXT.md`.
4. Always read `.ai/SKILLS.md`.
5. Always read `.ai/FILE_INDEX.md` before editing.
6. Read the related feature from `.ai/FEATURE_MAP.md`.
7. Read `.ai/API_MAP.md` for API work.
8. Read `.ai/DATABASE_MAP.md` for DB/migration/model work.
9. Read `.ai/BUGS_AND_RISKS.md` when fixing bugs or assessing risk.
10. For Flutter Dashboard work, read `.ai/FLUTTER_DASHBOARD_API_AUDIT.md` and `.ai/FLUTTER_DASHBOARD_BUILD_PROMPT.md` before planning or coding.

## Scanning Rules

- Do not scan the whole project unless `.ai` docs are missing, outdated, or the task requires architecture-wide changes.
- Use `.ai/FILE_INDEX.md` to identify relevant files first.
- Use `rg`/`rg --files` for targeted search.

## Change Rules

- Do not rename existing public functions, classes, routes, feature codes, or DTO fields unless necessary.
- Preserve existing behavior unless the task asks to change it.
- Make minimal safe changes.
- Keep changes scoped to the requested feature.
- Do not install packages unless explicitly requested.
- Do not expose secrets from `.env`, config, logs, or credentials.

## Backend Rules

- Follow Laravel-style backend architecture.
- Prefer FormRequests, resources, policies, and services over ad hoc controller logic.
- Respect tenant isolation in every query and mutation.
- Validate permissions and roles.
- Validate request payloads before business logic.
- Use `SubscriptionService` for entitlements, limits, pricing, and usage.
- Return standard API response shapes.

## Frontend Rules

- Follow Next.js + React best practices.
- For UI/UX changes, apply `DESIGN.md` before inventing new visual patterns. Do not force dark-mode palettes onto storefront pages unless explicitly requested.
- Use strict TypeScript and avoid `any`.
- Keep API paths under `/api/v1/*`.
- Use `lib/api-client.ts` for authenticated dashboard calls.
- Keep DTOs in `lib/types.ts` aligned with Laravel resources.
- Use existing UI primitives and lucide icons.

## Tenant And Subscription Rules

- Tenant root is the store owner account.
- Employees inherit owner tenant access.
- Store owners can have multiple stores.
- Store owners use one main dashboard Store Selector for their active/current store.
- Flutter Dashboard must be separate from the public storefront.
- Public storefront remains the existing web frontend.
- Backend APIs are the source of truth for Flutter Dashboard behavior.
- Store selection must happen only after authentication is known.
- Selected store ids must be validated against stores owned by or accessible to the authenticated account.
- Never trust `X-Store-ID` without ownership validation.
- Backend must verify store ownership for all store-scoped APIs.
- Store owners can create stores within their custom `max_stores` limit.
- Store owners manage profile, branding, contact, social/settings, and integration settings per selected owned store.
- Enforce subscription limits before creating stores, employees, products, media, and integration actions.
- Do not enforce SaaS order limits. Orders are revenue events and must only be blocked by store availability, checkout availability, delivery availability, valid cart/products, buyer restrictions, and stock.
- Upgrade prompts should use `PLAN_LIMIT_REACHED` or `FEATURE_DISABLED` response codes.

## Owner Input Translation Rule

- Do not add translated owner-input fields.
- Forbidden examples: `name_ar`, `name_ku`, `title_ar`, `title_ku`, `description_ar`, `description_ku`, `nameAr`, `titleKu`, `descriptionAr`.
- Store owner entered values must be canonical fields only, such as `name`, `title`, and `description`.
- UI labels may be translated; merchant data fields must not be duplicated by language.
- Product detail and cart/checkout labels must live in locale files, not inline multilingual objects.
- Public product detail routes must validate that the product belongs to the requested store slug before rendering.
- Dashboard product edit payloads must keep backend-required store/type/category identifiers aligned with `ProductRequest`.

## Telegram Rules

- Follow Telegram Bot API best practices.
- Store owner must not set or view Telegram bot token.
- Telegram bot token is platform-managed and backend-only.
- Do not log bot tokens.
- Do not accept bot-token fields in store-owner Telegram settings APIs.
- Validate bot/channel configuration.
- Keep webhook handling tenant-aware and idempotent.
- Gate features with `telegram_bot`.

## Al-Waseet Rules

- Keep credentials encrypted/hidden.
- Never reuse tokens across stores.
- Gate logistics features with `alwaseet_integration`.
- Preserve multi-tenant token tests.

## Auto-Update Rule For Future Tasks

After every future code change, the agent MUST update relevant `.ai` files:

- If files changed: update `.ai/FILE_INDEX.md`.
- If API changed: update `.ai/API_MAP.md`.
- If DB changed: update `.ai/DATABASE_MAP.md`.
- If feature logic changed: update `.ai/FEATURE_MAP.md`.
- If skills/rules changed: update `.ai/SKILLS.md` and `.ai/AGENT_RULES.md`.
- If bug fixed or risk found: update `.ai/BUGS_AND_RISKS.md`.
- Always append `.ai/CHANGELOG_AI.md`.

## Validation Rules

- Run `npx tsc --noEmit` for TypeScript-impacting changes.
- Run relevant PHP syntax checks and `php artisan test` when backend changes matter.
- If tests cannot run due environment, document the exact blocker.
- Do not claim tests passed if they did not.
