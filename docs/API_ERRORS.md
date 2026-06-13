# Error Contract

Common status mapping:
- `401` unauthenticated/session failure
- `403` forbidden, tenant denied, or subscription blocked
- `404` not found
- `422` validation failure
- `429` rate limited
- `500` safe generic server error

Error payload:
```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "You do not have permission.",
  "errors": {},
  "details": {}
}
```

Upload quota failures also include an upgrade-oriented plan payload when produced by the subscription service. Raw exceptions, SQL errors, storage secrets, Telegram tokens, and provider dumps are not part of the public API contract.
