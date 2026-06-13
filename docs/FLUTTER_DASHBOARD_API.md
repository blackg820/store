# Flutter Dashboard Product Integration

The Dokani Flutter dashboard is management-only. Buyer checkout remains under public storefront APIs.

## Product Screen Startup

1. Authenticate.
2. Validate/persist a selected store from backend store APIs.
3. Send `X-Store-ID` for store-scoped catalog work.
4. Fetch `GET /products/form-options`.
5. Fetch `GET /products` for the product list.

## Add/Edit Product

Use the product JSON structure documented in `API_PRODUCTS.md`. Store the product resource returned by Laravel; do not calculate permissions locally.

Flutter should respect:

- `permissions.can_edit`
- `permissions.can_delete`
- `permissions.can_upload_media`
- subscription data from `/products/form-options`

## Upload Product Photo/Video

Use multipart:

- URL: `POST /products/{product}/media`
- header: `Authorization: Bearer ...`
- header: `X-Store-ID: ...`
- field: `file`

Laravel uploads to Bunny when configured and returns the public CDN URL. Flutter never receives storage credentials.

## Tenant Failures

Clear the selected store when receiving:

- `UNAUTHENTICATED_TENANT`
- `TENANT_ACCESS_DENIED`

## Validation Failures

Render field errors from:

```json
{ "success": false, "message": "...", "errors": {} }
```

Limits return an application `code` plus upgrade/details data where available.
