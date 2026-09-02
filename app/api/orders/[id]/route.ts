import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { orderStatusSchema } from "@/modules/wave1/schemas";
import { transitionOrder } from "@/modules/wave1/order-transitions";

const activeRiderDeliveryStatuses = ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"];

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const workspace = url.searchParams.get("workspace");
  const secureAccessCode = url.searchParams.get("secureAccessCode");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  const order = await prisma.order.findFirst({ where: { id, companyId }, include: { items: true, customer: true, statusHistory: true, branch: true, rider: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (workspace === "kitchen") {
    return NextResponse.json({
      id: order.id,
      companyId: order.companyId,
      orderNumber: order.orderNumber,
      status: order.status,
      fulfilmentType: order.fulfilmentType,
      items: order.items,
      statusHistory: order.statusHistory,
    });
  }
  if (workspace === "delivery") {
    const address = order.deliveryAddressSnapshotJson && typeof order.deliveryAddressSnapshotJson === "object" ? order.deliveryAddressSnapshotJson as Record<string, unknown> : {};
    return NextResponse.json({
      id: order.id,
      companyId: order.companyId,
      orderNumber: order.orderNumber,
      status: order.status,
      fulfilmentType: order.fulfilmentType,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      rider: order.rider,
      items: order.items,
      delivery: { area: address.area, city: address.city },
      statusHistory: order.statusHistory,
    });
  }
  if (workspace === "rider") {
    if (!secureAccessCode) return NextResponse.json({ error: "secureAccessCode is required" }, { status: 400 });
    const rider = await prisma.rider.findFirst({ where: { secureAccessCode, companyId, active: true } });
    if (!rider || order.riderId !== rider.id || order.companyId !== rider.companyId) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const address = order.deliveryAddressSnapshotJson && typeof order.deliveryAddressSnapshotJson === "object" ? order.deliveryAddressSnapshotJson as Record<string, unknown> : {};
    const canSeeCustomerPii = activeRiderDeliveryStatuses.includes(order.status);
    return NextResponse.json({
      id: order.id,
      companyId: order.companyId,
      orderNumber: order.orderNumber,
      status: order.status,
      fulfilmentType: order.fulfilmentType,
      deliveredAt: order.deliveredAt,
      items: order.items,
      ...(canSeeCustomerPii ? {
        customerNameSnapshot: order.customerNameSnapshot,
        customerMobileSnapshot: order.customerMobileSnapshot,
        deliveryAddressSnapshotJson: order.deliveryAddressSnapshotJson,
        customerLatitude: order.customerLatitude,
        customerLongitude: order.customerLongitude,
        specialInstructions: order.specialInstructions,
        delivery: {
          landmark: address.landmark,
          deliveryInstructions: address.deliveryInstructions,
          latitude: order.customerLatitude ?? address.latitude,
          longitude: order.customerLongitude ?? address.longitude,
        },
      } : {}),
    });
  }
  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json();
  if (!payload.companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  const result = orderStatusSchema.safeParse(payload);
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const order = await prisma.order.findUnique({ where: { id }, select: { companyId: true } });
  if (!order || order.companyId !== payload.companyId) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const transition = await transitionOrder(prisma, { orderId: id, ...result.data });
  return NextResponse.json(transition.body, { status: transition.status });
}
