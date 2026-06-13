# Notifications API

Endpoints:
- `GET /notifications`
- `GET /notifications/unread-count`
- `POST|PATCH /notifications/{notification}/read`
- `POST|PATCH /notifications/read-all`

Notification list and counts can be scoped with `X-Store-ID`, `store_id`, or `storeId`. Unauthorized cross-store scopes are filtered or denied according to route semantics. Metadata is sanitized before return.
