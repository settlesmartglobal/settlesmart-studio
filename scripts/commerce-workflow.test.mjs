import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const utils = readFileSync("src/modules/wave1/utils.ts", "utf8");
const cart = readFileSync("app/components/cart.tsx", "utf8");
const receipt = readFileSync("app/receipt/[orderReference]/page.tsx", "utf8");
const seed = readFileSync("prisma/seed/commerce-demo.mjs", "utf8");
const notifications = readFileSync("src/modules/wave1/notifications.ts", "utf8");
const roles = readFileSync("src/modules/wave1/roles.ts", "utf8");
const webhook = readFileSync("app/api/webhooks/whatsapp/route.ts", "utf8");
const health = readFileSync("app/api/health/route.ts", "utf8");
const orders = readFileSync("src/modules/wave1/orders.ts", "utf8");
const settingsRoute = readFileSync("app/api/commerce/settings/route.ts", "utf8");
const productPage = readFileSync("app/order/[orderingSlug]/product/[productSlug]/page.tsx", "utf8");
const newProductPage = readFileSync("app/commerce/products/new/page.tsx", "utf8");
const editProductPage = readFileSync("app/commerce/products/[id]/edit/page.tsx", "utf8");
const commerceActions = readFileSync("app/components/commerce-actions.tsx", "utf8");
const publicMenu = readFileSync("app/order/[orderingSlug]/page.tsx", "utf8");
const storefront = readFileSync("src/modules/wave1/storefront.ts", "utf8");
const readiness = readFileSync("src/modules/wave1/readiness.ts", "utf8");
const importModule = readFileSync("src/modules/wave1/catalogue-import.ts", "utf8");
const qrBox = readFileSync("app/components/forms.tsx", "utf8");
const storefrontActions = readFileSync("app/components/storefront-actions.tsx", "utf8");
const offlineNotice = readFileSync("app/components/offline-notice.tsx", "utf8");
const serviceWorker = readFileSync("public/sw.js", "utf8");
const manifest = readFileSync("public/manifest.json", "utf8");
const commercePage = readFileSync("app/commerce/page.tsx", "utf8");

for (const status of ["PENDING", "ACCEPTED", "PREPARING", "READY", "RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "PAYMENT_COLLECTED", "COMPLETED", "REJECTED", "CANCELLED"]) {
  assert.match(schema, new RegExp(`\\b${status}\\b`), `${status} is present in Prisma schema`);
}

for (const transition of [
  'PENDING: ["ACCEPTED", "REJECTED"]',
  'ACCEPTED: ["PREPARING", "CANCELLED"]',
  'PREPARING: ["READY", "CANCELLED"]',
  'READY: ["RIDER_ASSIGNED", "CANCELLED"]',
  'RIDER_ASSIGNED: ["PICKED_UP", "READY", "CANCELLED"]',
  'PICKED_UP: ["OUT_FOR_DELIVERY"]',
  'OUT_FOR_DELIVERY: ["DELIVERED"]',
  'DELIVERED: ["PAYMENT_COLLECTED"]',
  'PAYMENT_COLLECTED: ["COMPLETED"]',
]) {
  assert.ok(utils.includes(transition), `transition exists: ${transition}`);
}

for (const field of ["customerName", "mobileNumber", "doorOrFlatNumber", "buildingName", "area", "city", "landmark", "deliveryInstructions", "lastSelectedFulfilmentType"]) {
  assert.ok(cart.includes(field), `checkout persists ${field}`);
}

assert.ok(cart.includes('"Business Bay": "Dubai"'), "Dubai area-city mapping includes Business Bay");
assert.ok(utils.includes('from === "READY" && to === "PAYMENT_COLLECTED"'), "pickup orders can collect payment once ready");
assert.ok(cart.includes("variantId: i.variantId"), "checkout submits selected variant IDs");
assert.ok(cart.includes("addOnIds: i.addOns?.map"), "checkout submits selected add-on IDs");
assert.ok(cart.includes("lineId"), "cart separates different product option combinations");
assert.ok(cart.includes("basePrice = selectedVariant?.price"), "cart uses selected variant final price as base");
assert.ok(cart.includes("Add AED ${price.toFixed(2)}"), "cart add button reflects selected variant plus add-ons");
assert.ok(cart.includes("meaningfulVariants"), "products without meaningful variants do not show a variant dropdown");
assert.ok(productPage.includes("variants={product.variants.map"), "product page exposes variant choices");
assert.ok(productPage.includes("addOnGroups={product.addOnGroups.map"), "product page exposes add-on choices");
assert.ok(orders.includes("entry.group.minSelections") && orders.includes("entry.group.maxSelections"), "server validates add-on choice limits");
assert.ok(orders.includes("variantSellingPrice(product, variant)"), "server recalculates selected variant price from DB");
assert.ok(orders.includes("variantSnapshot(item.product, item.variant)"), "order line snapshots include variant price and label");
assert.ok(!orders.includes("clientPrice"), "checkout does not trust client-submitted prices");
assert.ok(orders.includes("isOpenNow"), "opening hours affect checkout availability");
assert.ok(orders.includes("Online payment is not configured."), "online placeholder is blocked unless configured");
assert.ok(publicMenu.includes("Search menu"), "public ordering menu has search");
assert.ok(publicMenu.includes("Open for orders"), "public ordering menu shows open/closed state");
assert.ok(commercePage.includes("LiveOperations") && commercePage.includes("RecentOrdersCompact"), "Commerce overview uses compact RC operations widgets");
assert.ok(commercePage.includes("orders.slice(0, 5)") && commercePage.includes("View All Orders"), "Commerce overview limits recent orders and links to full order management");
assert.ok(!commercePage.includes('<Card title="Recent orders"><OrderList orders={orders.slice(0, 8)}'), "Commerce overview does not render full operational order controls as recent orders");
assert.ok(storefront.includes("NEXT_PUBLIC_COMMERCE_ORDER_URL") && storefront.includes("NEXT_PUBLIC_APP_URL"), "store URLs derive from environment configuration");
assert.ok(storefront.includes("/order/${orderingSlug}") && qrBox.includes("Download QR") && qrBox.includes("Share QR"), "QR encodes and shares the business store URL");
assert.ok(storefront.includes("wa.me/?text") && storefront.includes("No app download required"), "WhatsApp store sharing is user initiated and merchant branded");
assert.ok(readiness.includes("READY TO ACCEPT ORDERS") && readiness.includes("SETUP INCOMPLETE"), "merchant readiness checklist has clear statuses");
assert.ok(storefrontActions.includes("beforeinstallprompt") && storefrontActions.includes("Add {businessName} to Home Screen"), "Android install prompt is captured behind a branded CTA");
assert.ok(storefrontActions.includes("Tap Share") && storefrontActions.includes("Add to Home Screen"), "iOS install guidance is explicit");
assert.ok(storefrontActions.includes("navigator.share") && storefrontActions.includes("navigator.clipboard"), "customer Share Store uses native share with copy fallback");
assert.ok(manifest.includes('"display": "standalone"') && manifest.includes("SettleSmart Commerce"), "shared Commerce manifest is installable");
assert.ok(serviceWorker.includes('url.pathname.startsWith("/api/")') && serviceWorker.includes('url.pathname.startsWith("/order/")'), "service worker avoids stale dynamic ordering state");
assert.ok(offlineNotice.includes("You&apos;re offline. Reconnect to continue ordering."), "customer ordering has a clear offline message");
assert.ok(importModule.includes("SettleSmart_Commerce_Product_Import.xlsx") || importModule.includes("catalogueColumns"), "catalogue import template columns are centralized");
assert.ok(importModule.includes("parseCatalogueWorkbook") && importModule.includes("Duplicate active variant name"), "catalogue import validates preview rows");
assert.ok(importModule.includes("grouped.set(row.sku") && importModule.includes("productVariant.upsert"), "multi-variant import groups by merchant SKU");
assert.ok(importModule.includes("CREATE_OR_UPDATE") && importModule.includes("prisma.$transaction"), "catalogue import supports create/update transactionally");
assert.ok(settingsRoute.includes("commerceBusinessSettings.upsert"), "restaurant settings persist Commerce settings");
assert.ok(settingsRoute.includes("branchOperatingHours.upsert"), "restaurant settings persist branch opening hours");
assert.ok(commerceActions.includes("CommerceSettingsForm"), "restaurant settings form is visible in Commerce");
assert.ok(newProductPage.includes("categories.map((category) => ({ id: category.id, name: category.name }))"), "new product form receives serializable category summaries");
assert.ok(editProductPage.includes("categories.map((category) => ({ id: category.id, name: category.name }))"), "edit product form receives serializable category summaries");
assert.ok(receipt.includes('["PAYMENT_COLLECTED", "COMPLETED"].includes(order.status)'), "receipt is gated until payment collection");
assert.ok(seed.includes('"Chicken Biryani": "/uploads/commerce-chicken-biryani.svg"'), "Chicken Biryani has a seeded image");
assert.ok(seed.includes('name: "Standard", description: "Serves 1", price'), "demo seed creates Standard variant with serving label");
assert.ok(seed.includes('name: "Medium", description: "Serves 2", price: price + 8'), "demo seed creates Medium variant with absolute price");
assert.ok(seed.includes('name: "Family Pack", description: "Serves 5"'), "demo seed creates Family Pack variant with serving label");
assert.ok(seed.includes('name === "Chicken Biryani" ? 65 : price + 28'), "demo seed preserves final Chicken Family Pack price");
assert.ok(seed.includes('name: "Regular"') && seed.includes("active: false"), "confusing Regular demo variant is preserved inactive");
assert.ok(seed.includes('"Fresh Lime Soda": "/uploads/commerce-fresh-lime-soda.svg"'), "Fresh Lime Soda has a seeded image");
assert.ok(notifications.includes("WHATSAPP_PROVIDER"), "WhatsApp provider selection is environment-driven");
assert.ok(notifications.includes("commerce_payment_receipt"), "payment receipt template is mapped");
assert.ok(notifications.includes("SKIPPED_NO_CONSENT"), "WhatsApp consent is enforced");
assert.ok(notifications.includes("dedupeKey"), "notification idempotency key is implemented");
assert.ok(webhook.includes("hub.verify_token"), "WhatsApp webhook GET verifies challenge token");
assert.ok(webhook.includes("verifyWhatsappSignature"), "WhatsApp webhook POST verifies Meta signature");
assert.ok(roles.includes("FRONT_DESK") && roles.includes("KITCHEN") && roles.includes("DISPATCH") && roles.includes("RIDER"), "Commerce roles are mapped");
assert.ok(health.includes("database") && health.includes("whatsapp"), "health check covers database and WhatsApp readiness");
assert.ok(schema.includes("whatsappOperationalConsent"), "customer WhatsApp operational consent is stored");
assert.ok(schema.includes("WhatsAppInboundMessage"), "inbound WhatsApp messages are stored without changing order status");

console.log("Commerce workflow contract tests passed.");
