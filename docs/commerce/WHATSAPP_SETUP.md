# WhatsApp Setup

## Providers

- `development`: stores notification events and logs only redacted mobile numbers.
- `manual`: stores `READY_FOR_MANUAL_SEND` and exposes a `wa.me` fallback link.
- `meta`: submits approved WhatsApp templates through Meta Cloud API, stores provider message IDs, and waits for webhook confirmation before marking delivered/read.

## Environment Variables

`WHATSAPP_PROVIDER`, `WHATSAPP_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_DEFAULT_COUNTRY_CODE`, `WHATSAPP_TEMPLATE_LANGUAGE`, and `NEXT_PUBLIC_APP_URL`.

Never expose access tokens, app secrets, webhook signatures, or full customer mobile numbers in browser bundles or logs.

## Templates

- `ORDER_CREATED`: `commerce_order_received`
- `ORDER_ACCEPTED`: `commerce_order_accepted`
- `ORDER_REJECTED`: `commerce_order_rejected`
- `ORDER_OUT_FOR_DELIVERY`: `commerce_out_for_delivery`
- `ORDER_DELIVERED`: `commerce_order_delivered`
- `PAYMENT_COLLECTED` / `RECEIPT_READY`: `commerce_payment_receipt`

Template variables are validated before submission. Missing variables create `FAILED_VALIDATION`.

## Webhook

Configure Meta to use:

`{NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`

GET validates `hub.verify_token`. POST verifies `x-hub-signature-256`, processes status changes idempotently, and stores inbound messages without changing order status.

## Consent

Checkout includes operational WhatsApp consent. If declined, notifications are stored as `SKIPPED_NO_CONSENT`; secure tracking remains available.
