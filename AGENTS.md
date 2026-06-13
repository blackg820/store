# Dokani Backend Agent Notes

- Laravel `/api/v1` is the source of truth for Flutter dashboard behavior.
- Product dashboard changes should preserve parity with `components/dashboard/products-table.tsx`.
- Product media for Flutter should prefer product-scoped endpoints under `/products/{product}/media`.
- Store-scoped dashboard requests should carry `X-Store-ID`; tenant denial codes must remain stable.
- Bunny uploads are backend-only. Never expose `BUNNY_API_KEY`, Telegram tokens, Al-Waseet credentials, or provider payload dumps.
- Orders remain unlimited. Do not add order SaaS limits.
- Keep API docs in `docs/` updated when contracts change.
