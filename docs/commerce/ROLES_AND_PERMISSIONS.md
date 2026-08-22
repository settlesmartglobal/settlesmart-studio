# Commerce Roles and Permissions

## Roles

- `COMMERCE_OWNER`: full Commerce workspace access.
- `FRONT_DESK`: orders, customers, payment monitoring, completed orders.
- `KITCHEN`: accepted/preparing/prepared kitchen tickets and food instructions only.
- `DISPATCH`: ready orders, rider assignment, pickup and delivery board.
- `RIDER`: assigned active mobile order only.

The single-owner admin experience remains the default. V1 role permissions are centralized in `src/modules/wave1/roles.ts` for controlled test users and future auth enforcement.

## Security Notes

Business-scoped queries must always filter by company. Public tracking and receipts require tokens. Rider access uses secure access codes. WhatsApp test sending is disabled in production unless real admin authorization is added.
