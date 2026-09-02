import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCartLineId, toggleGroupedSelection, upsertCartLine } from "../src/modules/wave1/cart-state.ts";
import { isAddOnCompatibleWithProduct } from "../src/modules/wave1/commerce-rules.ts";
import { formatCommerceMoney } from "../src/modules/wave1/utils.ts";

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
const orderDetailPage = readFileSync("app/orders/[id]/page.tsx", "utf8");
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
const liveRefresh = readFileSync("app/components/live-refresh.tsx", "utf8");
const productMediaRoute = readFileSync("app/api/commerce/products/[id]/media/route.ts", "utf8");
const storage = readFileSync("src/modules/wave1/storage.ts", "utf8");
const orderDisplay = readFileSync("src/modules/wave1/order-display.ts", "utf8");
const orderNumbering = readFileSync("src/modules/wave1/order-numbering.ts", "utf8");
const orderTransitions = readFileSync("src/modules/wave1/order-transitions.ts", "utf8");
const serviceability = readFileSync("src/modules/wave1/serviceability.ts", "utf8");
const orderApi = readFileSync("app/api/orders/[id]/route.ts", "utf8");
const riderDeliveryPage = readFileSync("app/delivery/[secureAccessCode]/page.tsx", "utf8");

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

assert.ok(!cart.includes("areaCityMap"), "checkout does not hard-code Dubai area-city mappings");
assert.ok(cart.includes("merchantLocation.serviceAreas") && cart.includes("Select service area"), "checkout areas derive from merchant delivery zones");
assert.ok(cart.includes("merchantLocation.city"), "checkout city derives from merchant configuration");
assert.ok(!cart.includes('name="country"') && !cart.includes('name="postalCode"') && !cart.includes('name="region"'), "customer checkout hides country, postal code and region fields");
assert.ok(cart.includes("deliveryServiceability") && cart.includes("This location is outside this business's delivery area."), "checkout validates browser geolocation with the shared serviceability helper before storing coordinates");
assert.ok(utils.includes('from === "READY" && to === "PAYMENT_COLLECTED"'), "pickup orders can collect payment once ready");
assert.ok(cart.includes("variantId: i.variantId"), "checkout submits selected variant IDs");
assert.ok(cart.includes("addOnIds: i.addOns?.map"), "checkout submits selected add-on IDs");
assert.ok(cart.includes("lineId"), "cart separates different product option combinations");
assert.ok(cart.includes("basePrice = selectedVariant?.price"), "cart uses selected variant final price as base");
assert.ok(cart.includes("Add this product · ${formatCommerceMoney(price, currencyCode)}"), "cart add button reflects selected variant plus add-ons in merchant currency");
assert.ok(cart.includes("meaningfulVariants"), "products without meaningful variants do not show a variant dropdown");
assert.ok(productPage.includes("variants={product.variants.map"), "product page exposes variant choices");
assert.ok(productPage.includes("addOnGroups={compatibleAddOnGroups.map"), "product page exposes compatible add-on choices");
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
assert.ok(settingsRoute.includes("country: data.country || null") && settingsRoute.includes("region: data.region || null") && settingsRoute.includes("postalCode: data.postalCode || null"), "restaurant settings persist global merchant location fields");
assert.ok(commerceActions.includes("CommerceSettingsForm"), "restaurant settings form is visible in Commerce");
assert.ok(commerceActions.includes('placeholder="Country"') && commerceActions.includes("Region / State / Emirate") && commerceActions.includes("Postal code optional"), "restaurant settings form exposes global location inputs");
assert.ok(schema.includes("currencyCode         String") && schema.includes("orderPrefix          String") && commerceActions.includes("currencyCode") && commerceActions.includes("orderPrefix"), "merchant currency and order prefix are explicit company settings");
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
assert.ok(seed.includes('"Choose Drink"') && seed.includes('multipleSelection: true, minSelections: 0, maxSelections: 3') && seed.includes('"Water Bottle"') && seed.includes('"Soda"'), "demo Choose Drink allows multiple drink selections");
assert.ok(liveRefresh.includes('useState<string | null>(null)') && liveRefresh.includes('"Last updated --:--:--"') && liveRefresh.includes('setLastUpdated(formatRefreshTime(new Date()))'), "LiveRefresh uses deterministic initial hydration text");
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
assert.ok(schema.includes("enum DietaryClassification") && schema.includes("dietaryClassification DietaryClassification?"), "dietary classification is modeled additively");
assert.ok(schema.includes("region               String?") && schema.includes("postalCode           String?") && schema.includes("country               String?"), "merchant and branch location fields support global address formats");
assert.ok(cart.includes("detailsKey(slug)") && cart.includes("localStorage.setItem(detailsKey(slug)") && cart.includes("latitude: String(form.latitude"), "returning customer details include address and coordinates per merchant slug");
assert.ok(cart.includes("window.isSecureContext") && cart.includes("Location permission was denied.") && cart.includes("Location request timed out."), "current-location flow has truthful browser errors");
assert.ok(cart.includes("Added to cart") && cart.includes("Add this product") && cart.includes("adding ?"), "add-to-cart has visible confirmation and rapid duplicate protection");
assert.ok(cart.includes("Go to Cart") && cart.includes("Add Another Item") && cart.includes(`/order/${"${slug}"}/cart`) && cart.includes(`/order/${"${slug}"}`), "product page shows post-add cart and menu navigation");
assert.ok(productPage.includes("isAddOnCompatibleWithProduct") && orders.includes("isAddOnCompatibleWithProduct(product, addOn)"), "VEG/NON_VEG modifier filtering is enforced in UI and checkout");
assert.ok(commerceActions.includes("Image / Media") && commerceActions.includes("Remove Image") && commerceActions.includes("/media"), "Commerce backend product media management is present");
assert.ok(productMediaRoute.includes("findFirst({ where: { id, companyId }") && productMediaRoute.includes("COMMERCE_PRODUCT_IMAGE") && productMediaRoute.includes("Product not found for selected company"), "product media is tenant-scoped and product-associated");
assert.ok(storage.includes("storeCommerceImage") && storage.includes(".webp") && storage.includes("File exceeds 8MB") && storage.includes("Unsupported file type"), "Commerce image uploads are validated and optimized locally");
assert.ok(commerceActions.includes("role=\"radiogroup\"") && commerceActions.includes("1: \"Poor\"") && commerceActions.includes("5: \"Excellent\""), "feedback uses accessible five-star rating labels");
assert.ok(orderDetailPage.includes("Full Order Items") && orderDetailPage.includes("Order Summary") && orderDetailPage.includes("Customer"), "order detail page exposes authoritative order sections");
assert.ok(orderDetailPage.includes("OrderActionButtons") && orderDetailPage.includes("PaymentRecordForm"), "order detail uses existing operational actions and payment workflow");
assert.ok(orderDetailPage.includes("variantLabel(options.variant)") && orderDetailPage.includes("addOnLabel(addOn, order.company.currencyCode)") && orderDetailPage.includes("Special instructions"), "order detail exposes selected variant, modifiers and item instructions");
assert.ok(orderDetailPage.includes("if (!companyId) notFound()") && orderDetailPage.includes("order.companyId !== companyId"), "order detail validates company ownership before rendering");
assert.ok(orders.includes("Selected delivery area is not serviceable by this business.") && orders.includes("company.deliveryZones.find") && orders.includes("This location is outside this business's delivery area."), "checkout server enforces merchant service areas and delivery radius");
assert.ok(orders.includes('data.fulfilmentType === "DELIVERY"') && !orders.includes('data.fulfilmentType === "PICKUP" && settings?.deliveryEnabled'), "pickup orders do not run delivery serviceability validation");
assert.ok(orders.includes("deliveryServiceability"), "checkout/order validation reuses shared serviceability helper");
assert.ok(orders.includes("orderSequence.upsert") && orders.includes("merchantOrderNumber(company.orderPrefix") && schema.includes("@@unique([companyId, sequenceDate])"), "merchant order numbers use an atomic per-company daily sequence");
assert.ok(orderNumbering.includes("normalizeOrderPrefix") && orderNumbering.includes("padStart(4"), "order-number formatting normalizes prefixes and pads sequences");
assert.ok(commercePage.includes("CommerceOrderModal") && commercePage.includes("orderId") && commercePage.includes("closeHref") && commercePage.includes("scroll={false}"), "commerce order viewing opens an in-workspace modal that preserves URL context");
assert.ok(commercePage.includes("Full Order Items") && commercePage.includes("Order Summary") && commercePage.includes("Customer") && commercePage.includes("variantLabel(options.variant)") && commercePage.includes("addOnLabel(addOn, currencyCode)") && commercePage.includes("formatCommerceMoney"), "commerce modal displays full items, modifiers and customer details in merchant currency");
assert.ok(commercePage.includes("ServiceabilityPanel") && commercePage.includes("Distance from restaurant") && commercePage.includes("Delivery radius") && commercePage.includes("Within Delivery Area"), "orders modal/card show delivery distance and radius");
assert.ok(commercePage.includes('blockedActions: Record<string, string>') && commercePage.includes('ACCEPTED: "Outside configured delivery area"'), "outside-radius delivery cannot be accepted from Orders workflow");
assert.ok(commercePage.includes('mode === "delivery"') && commercePage.includes("Delivery order detail") && commercePage.includes("Close"), "delivery order modal is read-only");
assert.ok(!commercePage.includes("Studio Media") && !commercePage.includes("Public Ordering"), "Commerce header removes unfinished Studio media and duplicate ordering entry points");
assert.ok(!commercePage.includes("/orders/${order.id}?companyId=${order.companyId}") && commercePage.includes("commerceHref({ section: \"kitchen\", orderId: order.id })"), "commerce order list and kitchen tickets stay inside Commerce workspace");
assert.ok(orderDisplay.includes("selectedOptionsJson") && orderDisplay.includes("variant") && orderDisplay.includes("addOns") && orderDisplay.includes("formatCommerceMoney"), "order display helper reads persisted selected options and formats add-ons with merchant currency");
assert.ok(orderApi.includes("companyId is required") && orderApi.includes("findFirst({ where: { id, companyId }"), "order API requires tenant scope before returning order data");
assert.ok(orderApi.includes('workspace === "kitchen"') && !orderApi.slice(orderApi.indexOf('workspace === "kitchen"'), orderApi.indexOf('workspace === "delivery"')).includes("customerNameSnapshot"), "kitchen API response does not include customer name/mobile PII");
assert.ok(orderApi.includes('workspace === "delivery"') && orderApi.includes("delivery: { area: address.area, city: address.city }"), "delivery API response exposes only limited delivery context before rider-specific access");
const kitchenTickets = commercePage.slice(commercePage.indexOf("function KitchenTickets"), commercePage.indexOf("function addressSnapshot"));
assert.ok(!kitchenTickets.includes("customerNameSnapshot") && !kitchenTickets.includes("customerMobileSnapshot") && !kitchenTickets.includes("Coordinates"), "kitchen workspace does not render customer identity, mobile or precise coordinates");
assert.ok(kitchenTickets.includes("orderItemOptions(item)") && kitchenTickets.includes("variantLabel(options.variant)") && kitchenTickets.includes("addOnLabel(addOn, currencyCode)"), "kitchen still sees preparation details");
assert.ok(riderDeliveryPage.includes("secureAccessCode") && riderDeliveryPage.includes("riderId: rider.id") && riderDeliveryPage.includes("companyId: rider.companyId"), "assigned rider page gates customer PII by secure rider ownership and tenant query");
assert.ok(riderDeliveryPage.includes('const activeDeliveryStatuses: OrderStatus[] = ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"]'), "assigned rider can see customer PII only during active delivery statuses");
assert.ok(riderDeliveryPage.includes('const riderVisibleStatuses: OrderStatus[] = [...activeDeliveryStatuses, "DELIVERED"]'), "old rider URL may still resolve delivered order history");
assert.ok(riderDeliveryPage.includes("canSeeCustomerPii") && riderDeliveryPage.includes("order.riderId === rider.id") && riderDeliveryPage.includes("order.companyId === rider.companyId"), "rider PII render requires current assigned rider and company match");
assert.ok(riderDeliveryPage.includes("{canSeeCustomerPii && <div") && riderDeliveryPage.includes("order.customerNameSnapshot") && riderDeliveryPage.includes("order.customerMobileSnapshot"), "assigned rider before delivery can access name and mobile");
assert.ok(riderDeliveryPage.includes("Door / Flat No.") && riderDeliveryPage.includes("deliveryInstructions") && riderDeliveryPage.includes("Customer instructions"), "assigned rider before delivery can access address and instructions");
assert.ok(riderDeliveryPage.includes("latitude && longitude") && riderDeliveryPage.includes("google.com/maps"), "assigned rider before delivery can access coordinates/navigation where available");
assert.ok(riderDeliveryPage.includes("!canSeeCustomerPii") && riderDeliveryPage.includes("Delivery details hidden after completion.") && riderDeliveryPage.includes("Delivered at"), "delivered rider view revokes customer PII and keeps delivered timestamp");
assert.ok(riderDeliveryPage.includes("order.items.map") && riderDeliveryPage.includes("item.quantity") && riderDeliveryPage.includes("item.productNameSnapshot"), "rider can still see order item details after PII revocation");
const riderActiveBlock = riderDeliveryPage.slice(riderDeliveryPage.indexOf("{canSeeCustomerPii && <div"), riderDeliveryPage.indexOf("{!canSeeCustomerPii"));
const riderDeliveredBlock = riderDeliveryPage.slice(riderDeliveryPage.indexOf("{!canSeeCustomerPii"), riderDeliveryPage.indexOf("<ul className=\"mt-4"));
assert.ok(riderActiveBlock.includes("customerNameSnapshot") && riderActiveBlock.includes("customerMobileSnapshot"), "pre-delivery assigned-rider block contains required PII");
assert.ok(!riderDeliveredBlock.includes("customerNameSnapshot") && !riderDeliveredBlock.includes("customerMobileSnapshot") && !riderDeliveredBlock.includes("doorOrFlatNumber") && !riderDeliveredBlock.includes("latitude") && !riderDeliveredBlock.includes("google.com/maps"), "post-delivery rider block hides name, mobile, address, coordinates and navigation");
const riderApiBlock = orderApi.slice(orderApi.indexOf('workspace === "rider"'), orderApi.indexOf("return NextResponse.json(order)"));
const riderApiPiiBlock = riderApiBlock.slice(riderApiBlock.indexOf("...(canSeeCustomerPii"), riderApiBlock.indexOf(": {})"));
assert.ok(riderApiBlock.includes("secureAccessCode is required") && riderApiBlock.includes("order.riderId !== rider.id") && riderApiBlock.includes("order.companyId !== rider.companyId"), "direct rider API rejects unassigned, wrong-rider and cross-company reads");
assert.ok(riderApiBlock.includes("activeRiderDeliveryStatuses.includes(order.status)") && riderApiPiiBlock.includes("customerNameSnapshot") && riderApiPiiBlock.includes("customerMobileSnapshot") && riderApiPiiBlock.includes("deliveryAddressSnapshotJson"), "direct rider API returns PII only before delivery completion");
assert.ok(riderApiBlock.includes("items: order.items") && riderApiBlock.includes("deliveredAt: order.deliveredAt"), "direct rider API after Delivered still returns order ID/items/status and delivered timestamp");
assert.ok(!riderApiBlock.slice(riderApiBlock.indexOf("items: order.items"), riderApiBlock.indexOf("...(canSeeCustomerPii")).includes("customerNameSnapshot"), "direct rider API base payload remains post-delivery safe on old URL refresh");
assert.ok(utils.includes('fulfilmentType === "PICKUP"') && utils.includes('["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(to)'), "pickup workflow does not require rider delivery statuses");
assert.ok(serviceability.includes('input.fulfilmentType !== "DELIVERY"') && serviceability.includes("isWithinDeliveryRadius: true"), "pickup is exempt from delivery distance validation");
assert.ok(serviceability.includes("haversineDistanceKm") && serviceability.includes("distanceKm <= deliveryRadiusKm"), "shared serviceability helper computes inside/outside radius");
assert.ok(serviceability.includes("distanceKm: null") && serviceability.includes("isWithinDeliveryRadius: null"), "legacy orders without coordinates show unavailable distance");
assert.equal(formatCommerceMoney(32, "AED"), "AED 32.00", "Dubai merchant renders AED");
assert.equal(formatCommerceMoney(350, "INR"), "₹ 350.00", "India merchant renders INR rupee symbol");
assert.equal(formatCommerceMoney(3.5, "OMR"), "OMR 3.500", "OMR renders three decimal places");
for (const expectedReference of ["DD-ORD-20260902-0001", "DD-ORD-20260902-0002", "SR-ORD-20260902-0001", "KTC-ORD-20260902-0001"]) {
  assert.match(expectedReference, /^[A-Z0-9]{2,8}-ORD-20260902-\d{4}$/, `${expectedReference} matches merchant order number format`);
}
assert.ok(orderTransitions.includes("formatCommerceMoney") && !orderTransitions.includes("Amount paid: AED"), "payment receipt messages use merchant currency");

const multi = toggleGroupedSelection(["extra-chicken"], ["extra-chicken", "boiled-egg", "raita"], "boiled-egg", true, 4);
assert.deepEqual(multi, ["extra-chicken", "boiled-egg"], "multi-select modifier groups retain multiple choices");
const drinks = toggleGroupedSelection(["water-bottle"], ["water-bottle", "soda", "fresh-lime-soda"], "soda", true, 3);
assert.deepEqual(drinks, ["water-bottle", "soda"], "Choose Drink allows Water Bottle and Soda simultaneously");
const drinkMax = toggleGroupedSelection(["water-bottle", "soda", "fresh-lime-soda"], ["water-bottle", "soda", "fresh-lime-soda"], "juice", true, 3);
assert.deepEqual(drinkMax, ["water-bottle", "soda", "fresh-lime-soda"], "max selection is respected for multi-select groups");
const single = toggleGroupedSelection(["medium"], ["small", "medium", "large"], "large", true, 1);
assert.deepEqual(single, ["large"], "single-select modifier groups remain single-select");
assert.equal(isAddOnCompatibleWithProduct({ vegetarian: true, dietaryClassification: "VEG" }, { name: "Extra Chicken", dietaryClassification: "NON_VEG" }), false, "VEG product does not expose NON_VEG-only modifiers");
assert.equal(isAddOnCompatibleWithProduct({ vegetarian: false, dietaryClassification: "NON_VEG" }, { name: "Boiled Egg", dietaryClassification: "NON_VEG" }), true, "NON_VEG product can use permitted non-veg modifiers");

let acceptanceCart = [];
acceptanceCart = upsertCartLine(acceptanceCart, { productId: "chicken-biryani", lineId: buildCartLineId("chicken-biryani", "standard", ["extra-chicken", "boiled-egg", "water-bottle", "soda"]), name: "Chicken Biryani", price: 73, addOns: [{ id: "extra-chicken", name: "Extra Chicken", price: 8 }, { id: "boiled-egg", name: "Boiled Egg", price: 3 }, { id: "water-bottle", name: "Water Bottle", price: 4 }, { id: "soda", name: "Soda", price: 8 }] });
acceptanceCart = upsertCartLine(acceptanceCart, { productId: "vegetable-biryani", lineId: buildCartLineId("vegetable-biryani", "standard", []), name: "Vegetable Biryani", price: 36, addOns: [] });
acceptanceCart = upsertCartLine(acceptanceCart, { productId: "raita", lineId: buildCartLineId("raita"), name: "Raita", price: 6 });
acceptanceCart = upsertCartLine(acceptanceCart, { productId: "water-bottle", lineId: buildCartLineId("water-bottle"), name: "Water Bottle", price: 3 });
acceptanceCart = upsertCartLine(acceptanceCart, { productId: "soda", lineId: buildCartLineId("soda"), name: "Soda", price: 5 });
assert.equal(acceptanceCart.length, 5, "Chicken Biryani, Vegetable Biryani, Raita, Water Bottle and Soda remain in the same cart");
assert.deepEqual(acceptanceCart[0].addOns.map((addOn) => addOn.name), ["Extra Chicken", "Boiled Egg", "Water Bottle", "Soda"], "Chicken Biryani retains Extra Chicken, Boiled Egg, Water Bottle and Soda");
assert.deepEqual(acceptanceCart[1].addOns, [], "Vegetable Biryani remains independent and inherits no chicken/egg modifiers");
acceptanceCart = upsertCartLine(acceptanceCart, { productId: "chicken-biryani", lineId: buildCartLineId("chicken-biryani", "standard", ["extra-chicken", "boiled-egg", "water-bottle", "soda"]), name: "Chicken Biryani", price: 73, addOns: acceptanceCart[0].addOns });
assert.equal(acceptanceCart.length, 5, "intentional same-line increase does not create duplicate line records");
assert.equal(acceptanceCart[0].quantity, 2, "same configured line increases quantity only when explicitly added again");

console.log("Commerce workflow contract tests passed.");
