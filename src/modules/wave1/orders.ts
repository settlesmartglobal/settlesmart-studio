import { prisma } from "@/core/database/prisma";
import { checkoutSchema } from "./schemas";
import { haversineDistanceKm, money } from "./utils";
import { Prisma } from "@prisma/client";

export async function createOrder(input: unknown) {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, body: { errors: parsed.error.flatten() } };
  const data = parsed.data;

  const company = await prisma.company.findFirst({
    where: { orderingSlug: data.orderingSlug, commerceEnabled: true, status: "ACTIVE" },
    include: { deliveryZones: { where: { active: true }, orderBy: { radiusKm: "asc" } } },
  });
  if (!company) return { ok: false as const, status: 404, body: { error: "Ordering page not found" } };

  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { companyId: company.id, id: { in: productIds }, available: true },
  });
  if (products.length !== new Set(productIds).size) {
    return { ok: false as const, status: 400, body: { error: "One or more products are unavailable" } };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const items = data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Missing product");
    const unitPrice = money(product.promotionalPrice ?? product.regularPrice);
    return { product, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity };
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
    if (zone) {
      if (subtotal < money(zone.minimumOrderAmount)) {
        return { ok: false as const, status: 400, body: { error: `Minimum delivery order is ${money(zone.minimumOrderAmount)}` } };
      }
      deliveryCharge = money(zone.deliveryCharge);
    }
  }

  const totalAmount = subtotal + deliveryCharge;
  const orderNumber = `SS-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const customer = await tx.customer.create({
      data: {
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
        orderNumber,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === "PICKUP_PAYMENT" ? "NOT_APPLICABLE" : "PENDING",
        fulfilmentType: data.fulfilmentType,
        subtotal,
        deliveryCharge,
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
          })),
        },
        statusHistory: { create: { newStatus: "NEW", note: "Order placed" } },
      },
      include: { items: true, statusHistory: true },
    });
    return created;
  });

  return { ok: true as const, status: 201, body: order };
}
