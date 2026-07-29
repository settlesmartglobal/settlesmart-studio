import type { NotificationEventType, Prisma } from "@prisma/client";

type NotifyInput = {
  tx: Prisma.TransactionClient;
  companyId: string;
  orderId?: string;
  eventType: NotificationEventType;
  recipient?: string | null;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export function whatsappLink(phone?: string | null, message = "") {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export async function notifyDevelopmentLog(input: NotifyInput) {
  return input.tx.notificationEvent.create({
    data: {
      companyId: input.companyId,
      orderId: input.orderId,
      eventType: input.eventType,
      channel: "development-log",
      recipient: input.recipient || undefined,
      message: input.message,
      metadataJson: input.metadata,
    },
  });
}

export async function notifyOrderEvent(input: NotifyInput) {
  return notifyDevelopmentLog(input);
}
