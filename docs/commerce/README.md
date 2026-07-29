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
npx tsc --noEmit
npm run lint
npm run build
```

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
- Notification delivery uses database/logged events only.
- Real-time kitchen updates are not implemented; refresh-based operation is supported.
- Demo rider access codes are development-only deterministic tokens.
