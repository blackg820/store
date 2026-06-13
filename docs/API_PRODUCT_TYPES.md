# Product Types API

Endpoints:
- `GET /product-types`
- `POST /product-types`
- `GET /product-types/{productType}`
- `PUT|PATCH /product-types/{productType}`
- `DELETE /product-types/{productType}`

Product form bootstrapping should use `GET /products/form-options` first, which includes the store-scoped usable type list.
