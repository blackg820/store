# Dashboard Analytics API

Endpoint:
- `GET /analytics/dashboard`

Query/header scope:
- Optional `store_id`
- Optional `X-Store-ID`

The backend validates employee/store-owner tenancy and returns revenue, order counts, pending orders, revenue chart data, and top products. `conversionRate` is currently returned as `null` because the backend does not have a reliable conversion denominator.
