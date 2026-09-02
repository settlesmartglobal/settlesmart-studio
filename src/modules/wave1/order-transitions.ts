import { Prisma, type OrderStatus, type PaymentMethod, type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { appUrl, canTransition, formatCommerceMoney, money, statusTimestamp } from "./utils";
import { notifyOrderEvent, receiptTemplateVariables } from "./notifications";
import { RESTOCKABLE_ORDER_STATUSES, restoreTrackedInventoryForOrder } from "./inventory";

type TransitionInput = {
  orderId: string;
  status: OrderStatus;
  riderId?: string;
  reason?: string;
  note?: string;
  paymentStatus?: "PENDING" | "COLLECTED" | "FAILED" | "REFUNDED" | "NOT_REQUIRED";
  paymentMethod?: PaymentMethod;
  amountCollected?: number | string;
  paymentCollectedBy?: string;
  paymentNotes?: string;
};

type Tx = Prisma.TransactionClient;

const notificationForStatus: Partial<Record<OrderStatus, "ORDER_ACCEPTED" | "ORDER_REJECTED" | "ORDER_PREPARING" | "ORDER_READY" | "RIDER_ASSIGNED" | "ORDER_PICKED_UP" | "ORDER_OUT_FOR_DELIVERY" | "ORDER_DELIVERED" | "ORDER_CANCELLED">> = {
  ACCEPTED: "ORDER_ACCEPTED",
  REJECTED: "ORDER_REJECTED",
  PREPARING: "ORDER_PREPARING",
  READY: "ORDER_READY",
  RIDER_ASSIGNED: "RIDER_ASSIGNED",
  PICKED_UP: "ORDER_PICKED_UP",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
};

function paymentLabel(method: PaymentMethod) {
  return method.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function transitionOrder(prisma: PrismaClient, input: TransitionInput) {
  const existing = await prisma.order.findUnique({ where: { id: input.orderId }, include: { customer: true, rider: true, company: { include: { commerceSettings: true } } } });
  if (!existing) return { ok: false as const, status: 404, body: { error: "Order not found" } };
  if (!canTransition(existing.status, input.status, existing.fulfilmentType)) {
    return { ok: false as const, status: 400, body: { error: `Order cannot move from ${existing.status} to ${input.status}` } };
  }
  if (["REJECTED", "CANCELLED"].includes(input.status) && !input.reason?.trim()) {
    return { ok: false as const, status: 400, body: { error: "A reason is required." } };
  }
  if (input.status === "RIDER_ASSIGNED") {
    if (!input.riderId) return { ok: false as const, status: 400, body: { error: "Select an available rider before assigning delivery." } };
    const rider = await prisma.rider.findFirst({ where: { id: input.riderId, companyId: existing.companyId, active: true, availabilityStatus: "AVAILABLE" } });
    if (!rider) return { ok: false as const, status: 400, body: { error: "Rider is not available." } };
  }
  if (input.status === "PAYMENT_COLLECTED" && !["PENDING", "FAILED", "NOT_REQUIRED"].includes(existing.paymentStatus)) {
    return { ok: false as const, status: 400, body: { error: "Payment is not pending for this order." } };
  }

  const order = await prisma.$transaction(async (tx: Tx) => {
    const now = new Date();
    const paymentCollected = input.status === "PAYMENT_COLLECTED";
    const releaseRider = ["CANCELLED", "REJECTED"].includes(input.status);
    const updateData: Prisma.OrderUpdateInput = {
      status: input.status,
      paymentMethod: paymentCollected ? input.paymentMethod : undefined,
      paymentStatus: paymentCollected ? (existing.paymentStatus === "NOT_REQUIRED" ? "NOT_REQUIRED" : "COLLECTED") : input.paymentStatus,
      amountCollected: paymentCollected ? new Prisma.Decimal(existing.paymentStatus === "NOT_REQUIRED" ? 0 : money(input.amountCollected) || money(existing.totalAmount)) : undefined,
      paymentCollectedAt: paymentCollected ? now : undefined,
      paymentCollectedBy: paymentCollected ? input.paymentCollectedBy || "Commerce staff" : undefined,
      paymentNotes: paymentCollected ? input.paymentNotes || undefined : undefined,
      ...statusTimestamp(input.status),
    };
    if (input.status === "RIDER_ASSIGNED") updateData.rider = { connect: { id: input.riderId } };
    if (releaseRider && existing.riderId) updateData.rider = { disconnect: true };

    const updated = await tx.order.update({
      where: { id: input.orderId },
      data: updateData,
      include: { items: true, statusHistory: true, rider: true, company: { include: { commerceSettings: true } } },
    });

    if (input.status === "RIDER_ASSIGNED" && input.riderId) {
      await tx.rider.update({ where: { id: input.riderId }, data: { availabilityStatus: "ASSIGNED", currentOrderId: input.orderId } });
      await tx.riderAssignment.updateMany({ where: { orderId: input.orderId, active: true }, data: { active: false } });
      await tx.riderAssignment.create({ data: { orderId: input.orderId, riderId: input.riderId } });
    }
    if (input.status === "PICKED_UP" && existing.riderId) {
      await tx.riderAssignment.updateMany({ where: { orderId: input.orderId, riderId: existing.riderId, active: true }, data: { pickedUpAt: now } });
    }
    if (input.status === "DELIVERED" && existing.riderId) {
      await tx.rider.update({ where: { id: existing.riderId }, data: { availabilityStatus: "AVAILABLE", currentOrderId: null } });
      await tx.riderAssignment.updateMany({ where: { orderId: input.orderId, riderId: existing.riderId, active: true }, data: { active: false, deliveredAt: now } });
    }
    if (["CANCELLED", "REJECTED"].includes(input.status) && existing.riderId) {
      await tx.rider.update({ where: { id: existing.riderId }, data: { availabilityStatus: "AVAILABLE", currentOrderId: null } });
      await tx.riderAssignment.updateMany({ where: { orderId: input.orderId, riderId: existing.riderId, active: true }, data: { active: false } });
    }
    if (RESTOCKABLE_ORDER_STATUSES.includes(input.status)) {
      await restoreTrackedInventoryForOrder(tx, input.orderId);
    }

    await tx.orderStatusHistory.create({
      data: { orderId: input.orderId, previousStatus: existing.status, newStatus: input.status, reason: input.reason || undefined, note: input.note || undefined },
    });

    const restaurantName = existing.company.commerceSettings?.displayName ?? existing.company.name;
    const message = `Order ${existing.orderNumber} is now ${input.status.replaceAll("_", " ")}.`;
    const eventType = notificationForStatus[input.status];
    if (eventType) {
      await notifyOrderEvent({
        tx,
        companyId: existing.companyId,
        orderId: input.orderId,
        eventType,
        recipient: existing.customerMobileSnapshot,
        message,
        consentGranted: existing.customer.whatsappOperationalConsent,
        metadata: { templateVariables: { customerName: existing.customerNameSnapshot, orderNumber: existing.orderNumber, restaurantName, reason: input.reason || "Restaurant unavailable" } },
      });
    }
    if (paymentCollected) {
      const receiptUrl = `${appUrl()}/receipt/${existing.orderNumber}?token=${existing.trackingToken}`;
      const receiptMessage = `Hello ${existing.customerNameSnapshot},\n\nPayment has been received for order ${existing.orderNumber}.\n\nAmount paid: ${formatCommerceMoney(input.amountCollected || existing.totalAmount, existing.company.currencyCode)}\nPayment method: ${paymentLabel(existing.paymentMethod)}\n\nView your receipt:\n${receiptUrl}\n\nThank you for ordering with ${restaurantName}.`;
      const templateVariables = receiptTemplateVariables(existing);
      await notifyOrderEvent({
        tx,
        companyId: existing.companyId,
        orderId: input.orderId,
        eventType: "PAYMENT_COLLECTED",
        recipient: existing.customerMobileSnapshot,
        message: `Payment collected for ${existing.orderNumber}.`,
        consentGranted: existing.customer.whatsappOperationalConsent,
        metadata: { receiptUrl, templateVariables, manualMessage: receiptMessage },
      });
      await notifyOrderEvent({
        tx,
        companyId: existing.companyId,
        orderId: input.orderId,
        eventType: "RECEIPT_READY",
        recipient: existing.customerMobileSnapshot,
        message: `Receipt is ready for ${existing.orderNumber}.`,
        consentGranted: existing.customer.whatsappOperationalConsent,
        metadata: { receiptUrl, receiptToken: randomUUID(), templateVariables, manualMessage: receiptMessage },
      });
    }
    return updated;
  });
  return { ok: true as const, status: 200, body: order };
}
