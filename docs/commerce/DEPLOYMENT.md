# Commerce Deployment

## Commands

- Build: `npm run build`
- Start: `npm run start`
- Migrations: `npx prisma migrate deploy`
- Health check: `GET /api/health`

## Environment

Set `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `UPLOAD_DIR`, `MAX_UPLOAD_MB`, and the WhatsApp variables documented in `WHATSAPP_SETUP.md`.

## PostgreSQL

Use a managed PostgreSQL database for beta testing. Run migrations during deployment and do not run demo seeds in production.

## Storage

Local uploads use `UPLOAD_DIR` and are suitable only when the host provides persistent disk. Render-style ephemeral filesystems require persistent disk or future S3-compatible storage.

## Demo Seed

`npm run seed:commerce-demo` is development-only and is blocked when `NODE_ENV=production`.

## Render Notes

Use `npm ci`, `npx prisma migrate deploy`, `npm run build`, and `npm run start`. Configure persistent storage for uploads or keep uploads disabled until a durable provider is configured.
