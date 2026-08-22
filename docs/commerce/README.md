# SettleSmart Commerce

SettleSmart Commerce is the restaurant ordering and operations workspace inside the SettleSmart Studio application.

## Architecture

- Private workspace: `/commerce`
- Public ordering: `/order/[orderingSlug]`
- Secure public tracking: `/track/[orderReference]?token=[trackingToken]`
- Rider mobile route: `/delivery/[secureAccessCode]`
- Studio media integration: approved `MediaAsset` records are reused for Commerce placements and selection.

Commerce reuses the existing `Company`, `BrandProfile`, `ProductCategory`, `Product`, `Customer`, `Order`, `OrderItem`, `MediaAsset`, and `MediaPlacement` models. Commerce-specific records extend that base through `CommerceBusinessSettings`, `Branch`, `BranchOperatingHours`, `ProductVariant`, `AddOnGroup`, `AddOn`, `ProductAddOnGroup`, `Rider`, `RiderAssignment`, `Promotion`, `PromotionUsage`, `CustomerFeedback`, and `NotificationEvent`.

## Local Demo Seed

Run the Studio starter seed first if needed:

```bash
npm run seed:wave1
```

Run the Commerce demo seed:

```bash
npm run seed:commerce-demo
```

The demo seed is disabled when `NODE_ENV=production`. It creates one clearly marked demo restaurant:

- Business: Dubai Delights Restaurant
- Ordering slug: `dubai-delights`
- Currency: AED
- Timezone: Asia/Dubai
- Tax: 5%
- Promotion: `WELCOME10`

The seed is designed to be rerunnable. It upserts the restaurant, branch, menu categories, menu items, option groups, customers, riders, and promotion. Seeded demo orders use deterministic order references beginning with `SS-ORD-20260729`.

## Demo Reset

For local development, reset demo Commerce data by deleting records owned by the `dubai-delights` company in dependency order, then rerun:

```bash
npm run seed:commerce-demo
```

Do not run demo reset or demo seed against production data.

## Routes

- `/commerce?section=overview`
- `/commerce?section=restaurant`
- `/commerce?section=menu`
- `/commerce?section=orders`
- `/commerce?section=kitchen`
- `/commerce?section=delivery`
- `/commerce?section=customers`
- `/commerce?section=promotions`
- `/commerce?section=reports`
- `/commerce?section=settings`
- `/order/dubai-delights`
- `/order/dubai-delights/cart`
- `/order/dubai-delights/checkout`
- `/track/[orderReference]?token=[trackingToken]`
- `/delivery/[secureAccessCode]`

## Validation Commands

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate status
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Product Workflow

Commerce uses the restaurant status model `PENDING -> ACCEPTED -> PREPARING -> READY -> RIDER_ASSIGNED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED -> PAYMENT_COLLECTED -> COMPLETED`, plus terminal `REJECTED` and `CANCELLED`. The transition service validates every move, records status history, updates rider state, persists payment details, and creates notification events.

## WhatsApp

Set `WHATSAPP_PROVIDER` to `development`, `manual`, or `meta`. Development stores/logs safe redacted events. Manual stores `READY_FOR_MANUAL_SEND` with a `wa.me` link. Meta submits approved templates and only marks `SUBMITTED`; delivery/read require webhook callbacks. See `docs/commerce/WHATSAPP_SETUP.md`.

## Roles

V1 role permissions are defined in `src/modules/wave1/roles.ts`: owner, front desk, kitchen, dispatch, and rider. The current single-owner UI remains simple while the role map supports controlled test users.

## Health Check

`GET /api/health` returns application, database, storage, and WhatsApp readiness without exposing secrets.

## Production Checklist

- Apply the generated Prisma migration to the target database.
- Do not seed demo data in production.
- Configure real authentication and authorization for private Commerce APIs.
- Configure durable upload storage.
- Configure notification providers before claiming WhatsApp, email, or push delivery.
- Review public rate limiting and CSRF posture for deployment infrastructure.
- Replace placeholder product images or choose approved Studio media.

## Known Limitations

- Online payment gateways are intentionally not implemented.
- WhatsApp Cloud API requires approved Meta templates and webhook environment variables before real submission.
- Real-time kitchen updates are not implemented; refresh-based operation is supported.
- Demo rider access codes are development-only deterministic tokens.
