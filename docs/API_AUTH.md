# Auth API

Endpoints:
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/user`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `PATCH /profile`
- `PATCH /profile/password`

The current-user response includes role, permissions where available, parent ownership context, and subscription data exposed by the backend. Password changes revoke sessions according to the existing session policy. Flutter should treat `401` and `SESSION_REVOKED` as a sign-in reset.
