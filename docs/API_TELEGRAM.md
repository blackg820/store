# Telegram API

Store Telegram:
- `GET /stores/{store}/telegram-settings`
- `PATCH /stores/{store}/telegram-settings`
- `POST /stores/{store}/telegram-settings/test`
- `POST /stores/telegram/validate-bot`
- `POST /stores/telegram/validate-channel`

Product posting:
- `POST /products/{product}/telegram`

Dokani uses platform-managed bot credentials. Flutter never sends or receives raw bot tokens. Responses return safe connection status or validation outcomes only.
