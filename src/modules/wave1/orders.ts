import { prisma } from "@/core/database/prisma";
import { checkoutSchema } from "./schemas";
import { haversineDistanceKm, money } from "./utils";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { notifyOrderEvent, whatsappLink } from "./notifications";

export async function createOrder(input: unknown) {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, body: { errors: parsed.error.flatten() } };
  const data = parsed.data;

  const company = await prisma.company.findFirst({
    where: { orderingSlug: data.orderingSlug, commerceEnabled: true, status: "ACTIVE" },
    include: {
      deliveryZones: { where: { active: true }, orderBy: { radiusKm: "asc" } },
      commerceSettings: true,
      branches: { where: { active: true }, include: { hours: true }, take: 1 },
    },
  });
  if (!company) return { ok: false as const, status: 404, body: { error: "Ordering page not found" } };
  const settings = company.commerceSettings;
  const branch = company.branches[0];
  if (settings && !settings.acceptingOrders) return { ok: false as const, status: 400, body: { error: settings.temporaryClosureMessage || "The restaurant is temporarily unavailable." } };
  if (data.idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { companyId_idempotencyKey: { companyId: company.id, idempotencyKey: data.idempotencyKey } } });
    if (existing) return { ok: true as const, status: 200, body: existing };
  }

  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { companyId: company.id, id: { in: productIds }, available: true, inStock: true },
    include: { variants: true, addOnGroups: { include: { group: { include: { addOns: true } } } } },
  });
  if (products.length !== new Set(productIds).size) {
    return { ok: false as const, status: 400, body: { error: "One or more products are unavailable" } };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const items = data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Missing product");
    const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId && candidate.active) : undefined;
    if (item.variantId && !variant) throw new Error("Invalid product option");
    const allowedAddOns = product.addOnGroups.flatMap((entry) => entry.group.addOns.filter((addOn) => addOn.active));
    const selectedAddOns = (item.addOnIds ?? []).map((id) => {
      const addOn = allowedAddOns.find((candidate) => candidate.id === id);
      if (!addOn) throw new Error("Invalid add-on option");
      return addOn;
    });
    const unitPrice = money(product.promotionalPrice ?? product.regularPrice) + money(variant?.priceDelta) + selectedAddOns.reduce((sum, addOn) => sum + money(addOn.price), 0);
    return { product, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity, variant, selectedAddOns, instructions: item.instructions };
  });
  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

  let deliveryCharge = 0;
  if (data.fulfilmentType === "DELIVERY") {
    const zone = company.deliveryZones[0];
    const hasCoords = company.latitude && company.longitude && data.address.latitude !== "" && data.address.longitude !== "";
    if (zone && hasCoords) {
      const distance = haversineDistanceKm(
        { latitude: money(company.latitude), longitude: money(company.longitude) },
        { latitude: Number(data.address.latitude), longitude: Number(data.address.longitude) },
      );
      if (distance > money(zone.radiusKm)) {
        return {
          ok: false as const,
          status: 400,
          body: {
            error: "Delivery is currently available only within the configured delivery area. You may choose pickup or contact the business.",
          },
        };
      }
    }
    const minimumOrder = money(branch?.minimumOrderAmount ?? settings?.minimumOrderAmount ?? zone?.minimumOrderAmount);
    if (minimumOrder && subtotal < minimumOrder) {
      return { ok: false as const, status: 400, body: { error: `Minimum delivery order is ${minimumOrder}` } };
    }
    deliveryCharge = money(branch?.deliveryFee ?? settings?.deliveryCharge ?? zone?.deliveryCharge);
    const freeThreshold = money(branch?.freeDeliveryThreshold ?? settings?.freeDeliveryThreshold);
    if (freeThreshold && subtotal >= freeThreshold) deliveryCharge = 0;
  }

  let discountAmount = 0;
  let promotion: Awaited<ReturnType<typeof prisma.promotion.findFirst>> = null;
  if (data.promotionCode) {
    promotion = await prisma.promotion.findFirst({
      where: { companyId: company.id, code: data.promotionCode.toUpperCase(), active: true },
    });
    if (!promotion) return { ok: false as const, status: 400, body: { error: "Promotion code is not valid." } };
    if (subtotal < money(promotion.minimumOrder)) {
      return { ok: false as const, status: 400, body: { error: `Promotion requires a minimum order of ${money(promotion.minimumOrder)}` } };
    }
    if (promotion.type === "PERCENTAGE") discountAmount = subtotal * (money(promotion.percentDiscount) / 100);
    if (promotion.type === "FIXED_AMOUNT") discountAmount = money(promotion.fixedDiscount);
    if (promotion.type === "FREE_DELIVERY") discountAmount = deliveryCharge;
    const cap = money(promotion.maximumDiscount);
    if (cap) discountAmount = Math.min(discountAmount, cap);
  }

  const taxableSubtotal = items.filter((item) => item.product.taxable).reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.max(0, (taxableSubtotal - discountAmount) * (money(settings?.taxPercentage ?? 0) / 100));
  const totalAmount = subtotal - discountAmount + taxAmount + deliveryCharge;
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const countToday = await prisma.order.count({ where: { companyId: company.id, placedAt: { gte: new Date(`${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}T00:00:00.000Z`) } } });
  const orderNumber = `SS-ORD-${today}-${String(countToday + 1).padStart(4, "0")}`;

  const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const customer = await tx.customer.upsert({
      where: { companyId_mobile: { companyId: company.id, mobile: data.customer.mobile } },
      update: { name: data.customer.name, email: data.customer.email || undefined },
      create: {
        companyId: company.id,
        name: data.customer.name,
        mobile: data.customer.mobile,
        email: data.customer.email || undefined,
        marketingConsent: data.customer.marketingConsent,
      },
    });

    const created = await tx.order.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        branchId: branch?.id,
        orderNumber,
        trackingToken: randomUUID(),
        idempotencyKey: data.idempotencyKey,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === "PICKUP_PAYMENT" ? "NOT_REQUIRED" : "PENDING",
        fulfilmentType: data.fulfilmentType,
        subtotal,
        taxAmount,
        deliveryCharge,
        discountAmount,
        totalAmount,
        customerNameSnapshot: customer.name,
        customerMobileSnapshot: customer.mobile,
        deliveryAddressSnapshotJson: data.address,
        customerLatitude: data.address.latitude === "" ? undefined : data.address.latitude,
        customerLongitude: data.address.longitude === "" ? undefined : data.address.longitude,
        specialInstructions: data.specialInstructions || undefined,
        source: data.source,
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            productNameSnapshot: item.product.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            selectedOptionsJson: {
              variant: item.variant ? { id: item.variant.id, name: item.variant.name, priceDelta: money(item.variant.priceDelta) } : null,
              addOns: item.selectedAddOns.map((addOn) => ({ id: addOn.id, name: addOn.name, price: money(addOn.price) })),
              instructions: item.instructions || "",
            },
          })),
        },
        statusHistory: { create: { newStatus: "PENDING", note: "Order placed" } },
      },
      include: { items: true, statusHistory: true },
    });
    if (promotion) {
      await tx.promotionUsage.create({ data: { promotionId: promotion.id, orderId: created.id, discount: discountAmount } });
    }
    await notifyOrderEvent({
      tx,
      companyId: company.id,
      orderId: created.id,
      eventType: "ORDER_CREATED",
      recipient: data.customer.mobile,
      message: `Order ${created.orderNumber} was placed and is pending restaurant acceptance.`,
      metadata: { provider: "development-log", whatsappFallbackUrl: whatsappLink(data.customer.mobile, `Your order ${created.orderNumber} has been placed.`) },
    });
    return created;
  });

  return { ok: true as const, status: 201, body: order };
}
