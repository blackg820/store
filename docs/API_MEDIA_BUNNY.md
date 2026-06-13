# Dokani Product Media And Bunny.net

Flutter uploads media through Laravel. Bunny.net credentials stay in backend configuration and are never exposed to clients.

## Product Media Endpoints

- `GET /products/{product}/media`
- `POST /products/{product}/media`
- `DELETE /products/{product}/media/{media}`
- `POST /products/{product}/media/reorder`
- `POST /products/{product}/media/{media}/primary`

Legacy dashboard endpoints remain:

- `GET /media`
- `POST /media`
- `DELETE /media/{media}`
- `POST /media/{media}/replace`

## Upload Flow

1. Flutter sends bearer auth, `X-Store-ID`, and multipart `file`.
2. Laravel validates tenant/product ownership, role permissions, MIME type, and 50 MB file size.
3. Laravel checks the owner `storage_gb` entitlement.
4. Laravel stores a local backup file.
5. If Bunny is configured, Laravel uploads the same file to Bunny storage and returns the pull-zone CDN URL.
6. Laravel stores a `media` record and returns a clean `MediaResource`.

## Response Fields

```json
{
  "id": "81",
  "url": "https://cdn.example.test/store_12/file.png",
  "thumbnailUrl": null,
  "type": "image",
  "mime": "image/png",
  "size": 12345,
  "width": 800,
  "height": 800,
  "sortOrder": 0,
  "isPrimary": true
}
```

Videos return `width` and `height` as null unless future video probing is added. Thumbnail generation is not currently implemented; `thumbnailUrl` is reserved and returns null.

## Reorder And Primary

Reorder:

```json
{ "mediaIds": [93, 81, 82] }
```

Primary:

`POST /products/{product}/media/{media}/primary`

Only one media row per product is marked primary.

## Deletion

Product media deletion:

- soft-deletes the media row
- removes the local backup
- queues Bunny remote cleanup for Bunny-backed assets via the `media` queue

Queue workers must process the `media` queue in production.
