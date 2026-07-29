# Wave 2 Implementation

## Completed Scope

Wave 2 adds a usable AI Content Studio foundation on top of Wave 1: business context intelligence, deterministic demo extraction, platform-specific content generation, poster rendering, storyboards, media enhancement jobs, processing jobs, platform export packages, and controlled Use in Business placements.

## Intelligence and Provider Architecture

The internal Studio Intelligence layer lives in `src/modules/studio`. It is provider-independent and currently runs in safe demo mode. The implemented services cover business context, extraction, platform content, creative briefs, poster rendering, storyboards, media enhancement jobs, placement validation, and export packages.

## Demo Mode

`STUDIO_AI_MODE=demo` uses deterministic templates and rules. No external provider is required for app startup, local demos, lint, or build.

## External Provider Setup

Future providers can implement the same service boundaries and read server-only env vars such as `STUDIO_TEXT_PROVIDER`, `STUDIO_TEXT_API_KEY`, `STUDIO_IMAGE_PROVIDER`, and `STUDIO_IMAGE_API_KEY`. Browser code never receives provider secrets.

## Business Context Logic

Business context is derived from `Company`, approved `BrandProfile`, products, ordering URL, social handles, and campaign history. Industry visual profiles guide copy, poster, and storyboard recommendations for restaurant, grocery/retail, hotel, recruitment/manpower/HR, clinic, education, service, and general businesses.

## Platform Content Rules

Generated outputs are separate per platform. LinkedIn stays professional, Instagram is concise and visual-first, Facebook is community-oriented, and WhatsApp is mobile-readable. Recruitment outputs flag missing details instead of inventing salaries, benefits, visas, or guarantees.

## Poster Templates

The fallback renderer creates branded SVG posters with brand colors, headline, supporting text, CTA and destination. Supported dimensions include Instagram portrait/story, square, Facebook/LinkedIn landscape, WhatsApp portrait, reel/short-video cover, and ordering banner.

## Image Enhancement

Wave 2 creates derived media records with `sourceType=ENHANCED`, parent linkage, and processing jobs. The local demo implementation preserves the original and copies media as an enhancement placeholder; production image operations can be plugged into `src/modules/studio/media.ts`.

## Storyboard Workflow

Storyboards and scenes are stored in structured tables. Scene recommendations are industry-aware and include sequence, duration, purpose, caption, visual recommendation, transition, voiceover, music mood, CTA, and final end card.

## FFmpeg and Video Processing

Video requests create processing jobs. If FFmpeg is unavailable, jobs remain queued with a clear configuration message. Set `FFMPEG_PATH` and `MEDIA_PROCESSING_ENABLED=true` for future worker-enabled video processing.

## Processing Jobs

`MediaProcessingJob` tracks job type, status, progress, inputs, outputs, configuration, error messages, and timestamps. `/studio/processing-jobs` displays job state.

## Media Library

Media assets now support derived relationships, dimensions, duration, metadata, campaign/product linkage, placement counts, source type, approval, and platform fields.

## Use in Business

Approved assets can be placed into ordering, company, and recruitment placements. Active placements require approved media, reject expired activation, and prevent cross-company product placement. The public ordering homepage consumes active approved non-expired placements.

## Platform Exports

Platform exports create a generated JSON package containing selected campaign outputs, captions, hashtags, alt text, media references and posting notes. External publishing is intentionally deferred.

## Migration Instructions

Apply Wave 1 and Wave 2 migrations with:

```bash
npx prisma migrate deploy
```

Do not run `prisma migrate reset`.

## Environment Variables

```bash
STUDIO_AI_MODE=demo
STUDIO_TEXT_PROVIDER=
STUDIO_TEXT_API_KEY=
STUDIO_IMAGE_PROVIDER=
STUDIO_IMAGE_API_KEY=
STUDIO_AI_TIMEOUT_MS=60000
FFMPEG_PATH=
MEDIA_PROCESSING_ENABLED=false
MAX_IMAGE_UPLOAD_MB=15
MAX_VIDEO_UPLOAD_MB=200
```

Existing `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `UPLOAD_DIR`, and `MAX_UPLOAD_MB` remain in use.

## Manual Testing Checklist

- Confirm Wave 1 company, Brand Kit, commerce, ordering and orders still render.
- Create or seed campaigns, then open `/studio/create`.
- Run Studio Intelligence for a campaign.
- Confirm extracted details are stored and approved before generation.
- Confirm platform outputs differ between Instagram, Facebook, LinkedIn and WhatsApp.
- Generate a poster and confirm a MediaAsset is created.
- Generate a storyboard and inspect scenes on campaign detail.
- Request image/video enhancement and inspect processing jobs.
- Approve a generated asset in Media Library.
- Use an approved asset in an ordering placement.
- Confirm approved active placement appears on `/order/[orderingSlug]`.
- Confirm expired or unapproved placements do not activate.
- Generate a platform export package.
- Run Prisma format/validate/generate, lint and production build.

## Known Limitations

- Demo mode uses deterministic templates, not external LLMs.
- Poster output is SVG rather than raster PNG to avoid a heavy rendering dependency.
- Image enhancement is a safe derived-copy placeholder pending a real image processor.
- Video processing is queued when FFmpeg is unavailable and does not block HTTP requests.
- No social publishing or scheduling exists in Wave 2.

## Wave 3 Integration Points

External provider connectors, durable cloud media storage, background workers, social publishing, scheduling, advanced analytics, ZIP exports, official WhatsApp integration, and cross-product automation.
