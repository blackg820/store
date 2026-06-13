# Orders API

Endpoints:
- `GET /orders`
- `POST /orders`
- `GET /orders/{order}`
- `PATCH /orders/{order}`
- `PATCH /orders/{order}/status`
- `DELETE /orders/{order}`
- `POST /orders/{order}/alwaseet` when enabled

Dashboard order APIs are management-only. Dokani does not enforce SaaS order-count limits. Store-scoped requests must use `X-Store-ID` where the route is store-bound, and the backend validates tenant access.
