# Dokani Product API

Base path: `/api/v1`. Authenticated Flutter dashboard requests should send bearer auth and `X-Store-ID` for selected-store work.

## Product Endpoints

- `GET /products`
- `GET /products/form-options`
- `POST /products`
- `GET /products/{product}`
- `PUT|PATCH /products/{product}`
- `DELETE /products/{product}`
- `POST /products/{product}/telegram`

The existing web dashboard does not expose product duplication or bulk product actions, so no duplicate/bulk endpoint was introduced.

## Create/Update Payload

```json
{
  "storeId": 12,
  "productTypeId": 4,
  "categoryId": 9,
  "sku": "SHIRT-001",
  "title": "Dokani Shirt",
  "description": "Cotton shirt",
  "price": 10000,
  "costPrice": 7000,
  "discount": 10,
  "deliveryFee": 1500,
  "needsDeposit": false,
  "depositAmount": 0,
  "status": "active",
  "isActive": true,
  "customData": {},
  "options": [
    { "name": "Size", "type": "choice", "values": ["S", "M", "L"], "swatches": {} }
  ],
  "variants": [
    {
      "title": "Dokani Shirt / M",
      "sku": "SHIRT-M",
      "priceOverride": 11000,
      "stockQuantity": 5,
      "optionValues": { "Size": "M" },
      "imageId": null,
      "isActive": true
    }
  ]
}
```

Options and variants are owner-defined. The API does not hardcode size, color, or material.

## Product Response

Product detail responses include:

- core pricing/deposit fields
- `finalPrice`
- category and product type ids/names plus readable objects
- CDN-backed `media`
- dynamic `options`
- dynamic `variants`
- permissions such as `can_edit`, `can_delete`, and `can_upload_media`

Translated product title/description columns are not available. They were explicitly removed by migration `2026_05_02_104000_drop_translated_owner_input_columns.php`; Dokani stores canonical owner-entered product text.

## Form Bootstrap

`GET /products/form-options` returns:

- categories
- product types
- statuses
- store currency
- option presets from the store
- product/storage feature state
- media upload limits
- Flutter-facing create/delete/upload permissions

Use it when opening Add/Edit Product rather than hardcoding statuses or upload rules.
