# Media API

General media:
- `GET /media`
- `POST /media`
- `DELETE /media/{media}`
- `POST /media/{media}/replace`

Product media:
- `GET /products/{product}/media`
- `POST /products/{product}/media`
- `DELETE /products/{product}/media/{media}`
- `POST /products/{product}/media/reorder`
- `POST /products/{product}/media/{media}/primary`

See [API_MEDIA_BUNNY.md](./API_MEDIA_BUNNY.md) for the Laravel to Bunny upload flow, quotas, and response structure.
