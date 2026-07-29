import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { orderStatusSchema } from "@/modules/wave1/schemas";
import { canTransition, statusTimestamp } from "@/modules/wave1/utils";

const notificationForStatus = {
  ACCEPTED: "ORDER_ACCEPTED",
  REJECTED: "ORDER_REJECTED",
  PREPARING: "ORDER_PREPARING",
  READY: "ORDER_READY",
  RIDER_ASSIGNED: "RIDER_ASSIGNED",
  PICKED_UP: "ORDER_PICKED_UP",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, customer: true, statusHistory: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = orderStatusSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const existing = await prisma.order.findUnique({ where: { id }, include: { rider: true } });
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!canTransition(existing.status, result.data.status, existing.fulfilmentType)) {
    return NextResponse.json({ error: `Order cannot move from ${existing.status} to ${result.data.status}` }, { status: 400 });
  }
  if (result.data.status === "RIDER_ASSIGNED") {
    if (!result.data.riderId) return NextResponse.json({ error: "Select an available rider before assigning delivery." }, { status: 400 });
    const rider = await prisma.rider.findFirst({ where: { id: result.data.riderId, companyId: existing.companyId, active: true, availabilityStatus: "AVAILABLE" } });
    if (!rider) return NextResponse.json({ error: "Rider is not available." }, { status: 400 });
  }
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        status: result.data.status,
        riderId: result.data.status === "RIDER_ASSIGNED" ? result.data.riderId || undefined : undefined,
        paymentStatus: result.data.paymentStatus,
        ...statusTimestamp(result.data.status),
      },
      include: { items: true, statusHistory: true },
    });
    if (result.data.status === "RIDER_ASSIGNED" && result.data.riderId) {
      await tx.rider.update({ where: { id: result.data.riderId }, data: { availabilityStatus: "ASSIGNED", currentOrderId: id } });
      await tx.riderAssignment.create({ data: { orderId: id, riderId: result.data.riderId } });
    }
    if (["DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(result.data.status) && existing.riderId) {
      await tx.rider.update({ where: { id: existing.riderId }, data: { availabilityStatus: "AVAILABLE", currentOrderId: null } });
    }
    await tx.orderStatusHistory.create({
      data: { orderId: id, previousStatus: existing.status, newStatus: result.data.status, reason: result.data.reason || undefined, note: result.data.note || undefined },
    });
    const eventType = notificationForStatus[result.data.status as keyof typeof notificationForStatus];
    if (eventType) {
      await tx.notificationEvent.create({
        data: { companyId: existing.companyId, orderId: id, eventType, message: `Order ${existing.orderNumber} moved to ${result.data.status}.` },
      });
    }
    return updated;
  });
  return NextResponse.json(order);
}
