# Dokani Backend Known Issues

- Backend feature tests currently fail in this runtime because PHP lacks the SQLite PDO driver required by the in-memory test database.
- Queue-backed push notifications and Bunny/CDN cleanup require running queue workers and provider environment configuration.
- Realtime requires Reverb/Pusher environment configuration before Flutter can rely on websocket delivery.
- Public Telegram webhook hardening requires `TELEGRAM_WEBHOOK_SECRET` to be configured and webhook setup rerun by an admin.
- Billing checkout falls back to manual approval unless a provider checkout URL is configured.
- Some legacy Next.js frontend helpers still exist. Laravel `/api/v1` is the source of truth for Flutter.
