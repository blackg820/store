# Stores API

Core endpoints:
- `GET /stores`
- `POST /stores`
- `GET /stores/{store}`
- `PUT|PATCH /stores/{store}`
- `DELETE /stores/{store}`
- `GET /stores/form-options`
- `GET /stores/check-slug?slug=...`
- `GET /stores/{store}/settings`
- `PUT|PATCH /stores/{store}/settings`
- `PATCH /stores/{store}/status`
- `POST /stores/{store}/open`
- `POST /stores/{store}/close`
- `POST /stores/{store}/toggle-accepting-orders`

Branding uploads:
- `POST /stores/{store}/logo`
- `DELETE /stores/{store}/logo`
- `POST /stores/{store}/cover`
- `DELETE /stores/{store}/cover`

Uploads are multipart `file` requests. Laravel validates permissions, quota, MIME type, and forwards to Bunny when configured. The response includes the updated store plus media metadata. Mutation endpoints require store ownership or admin authority; read-only roles are rejected.
