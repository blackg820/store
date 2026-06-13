# Users, Roles, And Permissions

Supported dashboard roles:
- `admin`
- `store_owner`
- `employee`
- `support`
- `viewer`

Rules:
- Admins can inspect platform-wide resources where endpoints permit it.
- Store owners manage tenant resources.
- Employees inherit the owner tenant context and are limited to approved operational modules.
- Support and viewer roles are read-only unless a dedicated backend rule states otherwise.

The backend is authoritative. Flutter role-aware UI must still expect `403` responses on prohibited mutations.
