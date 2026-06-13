# Dokani Realtime Notifications

Dokani uses Laravel broadcasting with Reverb/Pusher-compatible private channels.

## Channels

- `private-store.{storeId}` for store-scoped dashboard events.
- `private-App.Models.User.{userId}` where user-scoped events are used.

The backend authorizes store channels by authenticated role and store ownership. Admins may access all store channels. Store owners and employees inherit access through the owner account.

Flutter must unsubscribe from the old store channel before subscribing to a newly selected store.

## Events

Current event naming follows dot-style names such as:

- `order.created`

Planned event names for dashboard clients:

- `order.status_changed`
- `subscription.updated`
- `limit.warning`
- `telegram.connected`
- `telegram.failed`
- `product.updated`
- `store.status_changed`
- `admin.alert`

Notification polling remains available through `/api/v1/notifications` as a fallback.
