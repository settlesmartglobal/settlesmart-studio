# Studio V1 Workspace Consolidation

## Scope

SettleSmart Studio™ is consolidated into one private admin workspace at `/studio`. The workspace is for brand management, campaigns, AI-assisted content, posters, media enhancement, Media Library, approvals, processing, templates and settings.

SettleSmart Commerce™ operational features are intentionally not part of the Studio navigation. Existing commerce/order foundations remain in the repository for continuity, but Studio V1 does not expose them as primary workspace sections.

The optional starter seed initializes `SettleSmart Works` as the default editable Business Profile. It includes the product family `SettleSmart Career™`, `SettleSmart HROps™`, `SettleSmart Studio™`, `SettleSmart Recruit™ (Coming Soon)`, and `SettleSmart Commerce™ (Coming Soon)`. Placeholder media records are marked as requiring upload.

## Workspace Sections

Use query-based internal navigation:

- `/studio?section=overview`
- `/studio?section=brand`
- `/studio?section=create`
- `/studio?section=campaigns`
- `/studio?section=media`
- `/studio?section=processing`
- `/studio?section=templates`
- `/studio?section=settings`

Legacy admin entry points redirect safely to the matching section.

## Studio Admin Model

The UI behaves as a single-owner admin workspace. Approval metadata uses the fixed identifier `single-admin` until the existing auth layer is expanded.

## Approved Media Contract

Future SettleSmart Commerce services can read approved Studio assets through:

```http
GET /api/studio/media/approved
```

Optional filters:

- `companyId`
- `campaignId`
- `mediaType`
- `platform`
- `usageType`

The endpoint returns only assets where:

- `approvalStatus = APPROVED`
- `approvedForExternalUse = true`

Returned fields include asset id, company, campaign, title, description, media type, platform, file URL, thumbnail URL, dimensions, duration, tags, approval status, approved date, usage type, and timestamps.

## Studio Media Usage Types

- `COMMERCE_HOMEPAGE_BANNER`
- `COMMERCE_PRODUCT_IMAGE`
- `COMMERCE_CATEGORY_BANNER`
- `COMMERCE_OFFER_BANNER`
- `COMMERCE_ORDER_CONFIRMATION_PROMOTION`
- `COMMERCE_WHATSAPP_PROMOTION`
- `GENERAL_MARKETING`

## Migration

Migration: `20260729153000_studio_v1_workspace_consolidation`

Apply with:

```bash
npx prisma migrate deploy
```

Do not run `prisma migrate reset`.

## Manual Checks

- Open `/studio`.
- Switch through all internal sections.
- Create or update company details in Brand.
- Save or approve Brand Kit details.
- Create a campaign and run Studio Intelligence in Create.
- Upload media in Media.
- Approve a media asset.
- Query `/api/studio/media/approved`.
- Confirm old admin paths redirect to `/studio?...`.
