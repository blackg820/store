# Database Map

Last updated: 2026-05-04

Primary DB: MySQL. Tests are configured to use SQLite `:memory:` in at least one suite, but this PHP environment lacks SQLite PDO.

## 2026-05-11 Runtime Hardening From `.ai2`

- No new DB migration was added for the backend/runtime gap pass.
- Push sending, Telegram webhook secret validation, Bunny remote cleanup, and `/buyers/auth` removal use existing tables/config.
- `device_tokens`: Flutter/mobile push token registration. Stores `user_id`, optional `store_id`, hidden token plus `token_hash`, `platform`, device/app metadata, `last_seen_at`; `token_hash` is unique.

## Core Tables

### users

- Columns: `id`, `parent_id`, `name`, `email`, `email_verified_at`, `password`, `role`, `mode`, `subscription_plan`, `status`, `remember_token`, timestamps, `deleted_at`.
- Meaning: platform admins, store owners, and employees.
- Relationships: has many stores, employees by `parent_id`, subscriptions.
- Risks: legacy `subscription_plan` string still coexists with dynamic subscriptions.

### stores

- Columns: `id`, `user_id`, `name`, `slug`, `whatsapp_number`, `description`, `default_language`, `status`, `base_currency`, `base_language`, `delivery_time`, `theme_settings`, `option_presets`, `notification_settings`, `logo_url`, `cover_url`, Telegram fields, Al-Waseet encrypted fields, timestamps, `deleted_at`.
- Meaning: tenant commerce storefront owned by a user.
- Relationships: belongs to user; has products, orders, media.
- Constraints: slug unique; owner input fields are canonical only.
- Business rules: employees inherit owner store access for catalog operations but do not own stores; store owners can own multiple stores and select one current store in the dashboard; store owners are limited by custom per-user `max_stores`/canonical `stores` limits on creation; platform admins bypass store-count limits.
- Risks: integration credentials must remain hidden/encrypted; `theme_settings` and `notification_settings` are flexible JSON and need schema validation before broader settings expansion.

### product_types

- Columns: `id`, `store_id`, `name`, `slug`, `schema`, `is_active`, timestamps, `deleted_at`.
- Meaning: dynamic catalog type/schema.
- Relationships: belongs to store; products/categories can reference it.
- Risks: schema validation not fully formalized.

### categories

- Columns: `id`, `store_id`, `product_type_id`, `parent_id`, `name`, `slug`, `is_active`, `sort_order`, timestamps, `deleted_at`.
- Meaning: nested product grouping.
- Relationships: belongs to store/product type/parent category; has children/products.
- Risks: global vs store-specific category behavior should be clarified.

### products

- Columns: `id`, `store_id`, `sku`, `product_code`, `product_type_id`, `category_id`, `title`, `description`, `price`, `cost_price`, `discount`, `delivery_fee`, `custom_data`, `rating`, `rating_count`, `needs_deposit`, `deposit_amount`, `is_active`, `status`, timestamps, `deleted_at`.
- Meaning: sellable storefront items.
- Relationships: belongs to store/category/product type; has media/options/variants/orderItems.
- Risks: product stock is variant-level only; no top-level stock column documented.

### product_options

- Columns: `id`, `product_id`, `name`, `values_json`, `swatches_json`, `type`, `position`, timestamps.
- Meaning: option definitions such as size/color.
- Relationships: belongs to product.
- Risks: option values need consistent DTO shape.

### product_variants

- Columns: `id`, `product_id`, `title`, `sku`, `price_override`, `stock_quantity`, `image_id`, `is_active`, `option_values`, timestamps.
- Meaning: purchasable variant combinations.
- Relationships: belongs to product; optional image media.
- Risks: matching options must stay server-authoritative during checkout.

### media

- Columns: `id`, `store_id`, `product_id`, `url`, `file_path`, `file_size`, `type`, `is_main`, `storage_provider`, `visibility`, `metadata`, timestamps, `deleted_at`.
- Meaning: images/videos for stores/products.
- Relationships: belongs to store/product.
- Risks: local write before Bunny upload; quota reservation could be made stronger.

### buyers

- Columns: `id`, `user_id`, `phone`, `name`, `email`, `password_hash`, `address`, `total_orders`, `rejected_orders`, `risk_level`, `is_blacklisted`, timestamps, `deleted_at`.
- Meaning: customers/buyers scoped to tenant owner.
- Relationships: has many orders.
- Constraints/indexes: unique `(user_id, phone)` via `buyers_user_id_phone_unique`; global `phone` unique is intentionally removed.
- Business rule: the same phone number may order from multiple store owners, but a single owner should only have one buyer row per phone.
- Risks: if duplicate `(user_id, phone)` rows are imported manually, the repair migration falls back to a non-unique index and duplicates must be merged before enforcing uniqueness.

### orders

- Columns: `id`, `client_reference_id`, `store_id`, `group_id`, `product_id`, `buyer_id`, customer fields, `status`, Al-Waseet fields, location/shipping fields, notes, `total_amount`, `cod_amount`, `delivery_fee`, timestamps, `deleted_at`.
- Meaning: commerce order.
- Relationships: belongs to store/buyer; has many order_items.
- Risks: legacy `product_id` on order coexists with `order_items`.

### order_items

- Columns: `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `options`, timestamps.
- Meaning: line items.
- Relationships: belongs to order/product.
- Risks: variant id is not stored, only options JSON.

## Billing Tables

### plans

- Columns: `id`, `code`, `name`, `description`, `type`, `billing_model`, `price`, `base_price_cents`, `currency`, `interval`, `duration_days`, `trial_days`, `status`, `sort_order`, `is_public`, legacy limit columns, timestamps.
- Meaning: SaaS subscription plan.
- Risks: legacy `type` and `billing_model` overlap.

### features

- Columns: `id`, `code`, `name`, `slug`, `description`, `type`, `unit`, `reset_interval`, `is_active`, timestamps.
- Meaning: billable/gated feature catalog.
- Canonical active limit codes: `storage_gb`, `stores`, `employees`, `products`, `api_requests`, `telegram_bot`, `alwaseet_integration`, `custom_domain`, `premium_support`. Legacy `orders_per_month` must not block orders.

### user_limits

- Columns: `id`, `user_id`, `limits` JSON, `pricing` JSON, `base_price_cents`, `total_price_cents`, `currency`, timestamps.
- Meaning: per-store-owner custom SaaS limits and calculated subscription price.
- Relationships: belongs to `users`; one row per store owner through unique `user_id`.
- Business rules: replaces fixed plan dependency for admin-assigned store owner limits. Orders are not limited here.
- Risks: needs audit log/history before high-stakes billing edits.

### plan_features

- Columns: `id`, `plan_id`, `feature_id`, `included_quantity`, `limit_quantity`, `limit_value`, `overage_price`, `price_per_unit_cents`, `overage_price_cents`, `is_enabled`, `hard_limit`, `reset_interval`, timestamps.
- Meaning: plan entitlement/pricing matrix.
- Risks: `limit_value` legacy duplicates `limit_quantity`.

### subscriptions

- Columns: `id`, `user_id`, `plan_id`, `plan_code`, `status`, `starts_at`, `ends_at`, `trial_ends_at`, `canceled_at`, `metadata`, provider/current period fields, cleanup fields, timestamps.
- Meaning: customer subscription for tenant owner.
- Risks: provider fields are Stripe-compatible but provider handoff not implemented.

### subscription_usages

- Columns: `id`, `subscription_id`, `feature_id`, `used_count`, `last_reset_at`, timestamps.
- Meaning: current usage counter.
- Risks: reset/rollup jobs needed.

### usage_records

- Columns: `id`, `subscription_id`, `feature_id`, `idempotency_key`, `quantity`, `metadata`, `recorded_at`, timestamps.
- Meaning: raw idempotent metered usage log.

### usage_rollups

- Columns: `id`, `subscription_id`, `feature_id`, `period_start`, `period_end`, `quantity`, timestamps.
- Meaning: periodic usage summaries.

### subscription_feature_overrides

- Meaning: customer-specific enterprise overrides.
- Created by billing migration; use for enterprise exceptions.

## Integration Tables

- `al_waseet_cities`, `al_waseet_regions`, related location tables: Al-Waseet reference data.
- `push_subscriptions`: browser push endpoints/keys.
- `notifications`: dashboard notification rows for polling/realtime fallback. Columns include nullable `user_id`, `store_id`, `order_id`, `type`, `title`, `body`, `metadata`, `read_at`, timestamps; indexed by user/store/read state.
- `device_tokens`: Flutter/mobile push token registration. Stores `user_id`, optional `store_id`, hidden token plus `token_hash`, `platform`, device/app metadata, `last_seen_at`; `token_hash` is unique.
- `global_customers`: global phone-based customer risk profile with `rejection_count`, `risk_level`, total order/rejection counters, and first/last order timestamps.
- `customer_notification_subscriptions`: store-scoped customer marketing subscriptions. Endpoint/keys are hidden/encrypted; stores should not receive raw device token data.
- `customer_notification_campaigns`: store-scoped multilingual marketing campaign definitions with channels, segment, template, schedule, and send state.
- `customer_notification_deliveries`: delivery tracking for campaigns with queued/delivered/opened/clicked/failure state.
- `analytics_events`: public storefront/mobile tracking events for visits, product views, checkout starts, and campaign interactions.
- `store_daily_stats`: per-store daily order, revenue, traffic, checkout, notification, and device breakdown rollups.
- `product_daily_stats`: per-product daily views, units sold, and revenue rollups.
- `notification_daily_stats`: per-campaign/store daily queued/sent/delivered/opened/clicked/failed rollups and channel breakdown.
- `platform_daily_stats`: daily platform user/store/order/job/storage rollups.
- `system_events`: sanitized operational events for tenant denials, auth failures, domain resolution failures, queue/provider failures, notification failures, and slow analytics requests. Never store secrets or raw provider payloads.
- `scheduler_heartbeats`: scheduler and analytics aggregation heartbeat timestamps for health checks.
- `audit_logs`: entity action records.
- Laravel core: `personal_access_tokens`, cache, jobs, failed jobs, migrations.

## 2026-06-13 Enterprise Upgrade Additions

- `stores.subdomain`, `stores.custom_domain`, `stores.domain_verified_at`: host-based storefront routing. `subdomain` and `custom_domain` are unique; custom domains remain pending until verified.
- `buyers.global_customer_id` and `orders.global_customer_id`: link tenant-local buyer/order records to global phone risk.
- `products.slug`: nullable product slug field for future product-slug URLs and indexing.
- Added indexes for store status/user/domain lookup, product/category slugs, order status/global-customer dates, buyer risk, notification campaign/delivery queries, and analytics event queries.

## 2026-06-13 Production Readiness Additions

- Added daily aggregate tables for store, product, customer notification, and platform analytics.
- Added sanitized `system_events` for admin operations visibility and failure logging.
- Added `scheduler_heartbeats` to make scheduler and aggregation freshness visible in deep health.
- Added feature aliases for `customer_notifications`, `scheduled_notifications`, and `notification_templates`; legacy `orders_per_month` remains explicitly non-blocking.

## 2026-05-10 Flutter Dashboard API Readiness Additions

- `stores.checkout_enabled`: boolean checkout availability flag used with `stores.status`.
- `stores.telegram_message_thread_id`: Telegram topic/thread id for groups that use topics.
- `buyers.notes`: store-owner buyer notes.
- `buyers.blacklist_reason`: reason shown to owner/admin when buyer is blacklisted.
- No order-limit columns were added. Legacy order limit concepts remain deprecated and must not block orders.

## DB Rules And Risks

- Do not add translated owner-input columns.
- Preserve soft deletes where present.
- Keep tenant owner foreign-key relationships clear.
- Add indexes for high-volume list/search surfaces.
- Make `migrate:fresh --seed` pass before major backend changes.
- Be careful with MySQL enum alterations in migrations.
