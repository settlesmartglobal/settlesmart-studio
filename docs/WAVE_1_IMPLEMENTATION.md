# Wave 1 Implementation

## Implemented Scope

Wave 1 establishes SettleSmart Studio Beta as a tenant-centered platform for company profiles, Brand Kit setup, local commerce, ordering, orders, reusable media, and campaign records. Actual AI generation, reels/video rendering, social publishing, online payments, Google Maps API, and official WhatsApp API integration are deferred.

## Architecture

- `Company` remains the central tenant entity.
- Existing company schema, repository, service, and `/api/company` behavior were extended instead of replaced.
- New route handlers validate inputs with Zod and scope records by `companyId`.
- Public checkout sends product IDs and quantities only; prices and totals are calculated on the server.
- Order placement uses a Prisma transaction to create customer, order, order items, and status history.

## Database Models

Added models: `BrandProfile`, `BrandAsset`, `ProductCategory`, `Product`, `DeliveryZone`, `OperatingHours`, `Customer`, `Order`, `OrderItem`, `OrderStatusHistory`, `StudioCampaign`, and `MediaAsset`.

Extended `Company` with business profile, location, ordering, and feature flags.

## Pages and APIs

Admin pages include dashboard, companies, Brand Kit, commerce, products, delivery, operating hours, orders, campaigns, media library, analytics placeholder, and settings placeholder.

Public ordering pages include menu, product detail, cart, checkout, confirmation, and tracking under `/order/[orderingSlug]`.

APIs include company CRUD, Brand Kit upsert, category/product/delivery/operating-hours setup, uploads, order creation/status updates, campaigns, and media library status updates.

## Environment Variables

```bash
DATABASE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPLOAD_DIR=public/uploads
MAX_UPLOAD_MB=25
```

## Migration Commands

Apply the new migration with:

```bash
npx prisma migrate deploy
```

For local development, use the project’s normal Prisma migration workflow after reviewing `prisma/migrations/20260729130000_wave1_core_commerce_brand_campaign/migration.sql`.

## Seed Command

```bash
npm run seed:wave1
```

The seed is blocked when `NODE_ENV=production`. The current starter profile is `SettleSmart Works`, with SettleSmart product-family records and placeholder media marked as requiring upload.

## Public Ordering Flow

QR/link to `/order/[orderingSlug]` opens the menu. Customers can view products, add items to a session cart, checkout with delivery or pickup, receive an order number, and track the order timeline.

## Delivery Radius Method

`haversineDistanceKm` calculates straight-line distance between company coordinates and customer coordinates. If an active delivery zone exists and the customer is outside the radius, delivery is blocked and pickup is offered.

## File Storage Approach

Uploads are stored under `UPLOAD_DIR`, defaulting to `public/uploads`. The upload abstraction validates MIME type and extension, enforces `MAX_UPLOAD_MB`, generates safe filenames, and prevents path traversal. Local filesystem storage is not persistent on typical Render instances; Wave 2 should move uploads to durable cloud object storage.

## Manual Test Checklist

- Create or review the SettleSmart Works Business Profile.
- Configure Brand Kit colors and upload a supported brand asset.
- Create categories and products.
- Configure a delivery zone.
- Open `/order/[orderingSlug]`, add products to cart, and place a delivery or pickup order.
- Open `/orders`, inspect the order, and update its status.
- Upload a media asset and review its media detail page.
- Create a campaign and confirm the Wave 2 message is shown.

## Known Limitations

- No authentication enforcement beyond an authenticated-style shell.
- Product edit route currently reuses the create form as a basic placeholder.
- Operating-hours edits are API-backed with a simple admin listing.
- Uploads are local-only and need persistent cloud storage for production durability.
- QR copy action is represented by URL display and QR download.

## Wave 2 Integration Points

- AI brand extraction from uploaded assets.
- Campaign content generation and approval workflows.
- Reels/video rendering.
- Social publishing integrations.
- Online payment gateways.
- Official WhatsApp API.
- Durable media storage and placement automation.
