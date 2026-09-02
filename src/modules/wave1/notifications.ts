import { createHmac, timingSafeEqual } from "crypto";
import type { NotificationEventType, Prisma } from "@prisma/client";
import { appUrl, formatCommerceMoney } from "./utils";

export type NotificationStatus = "PENDING" | "READY_FOR_MANUAL_SEND" | "SUBMITTING" | "SUBMITTED" | "DELIVERED" | "READ" | "FAILED" | "FAILED_VALIDATION" | "SKIPPED_NO_CONSENT" | "SKIPPED_NO_PROVIDER";
type Provider = "development" | "manual" | "meta";

type NotifyInput = {
  tx: Prisma.TransactionClient;
  companyId: string;
  orderId?: string;
  eventType: NotificationEventType;
  recipient?: string | null;
  message: string;
  metadata?: Prisma.InputJsonObject;
  consentGranted?: boolean;
};

const statusRank: Record<string, number> = {
  PENDING: 0,
  READY_FOR_MANUAL_SEND: 1,
  SUBMITTING: 2,
  SUBMITTED: 3,
  DELIVERED: 4,
  READ: 5,
  FAILED_VALIDATION: 6,
  FAILED: 6,
  SKIPPED_NO_CONSENT: 6,
  SKIPPED_NO_PROVIDER: 6,
};

export const whatsappTemplates: Partial<Record<NotificationEventType, { name: string; required: string[] }>> = {
  ORDER_CREATED: { name: "commerce_order_received", required: ["customerName", "orderNumber", "restaurantName"] },
  ORDER_ACCEPTED: { name: "commerce_order_accepted", required: ["customerName", "orderNumber", "restaurantName"] },
  ORDER_REJECTED: { name: "commerce_order_rejected", required: ["customerName", "orderNumber", "restaurantName", "reason"] },
  ORDER_OUT_FOR_DELIVERY: { name: "commerce_out_for_delivery", required: ["customerName", "orderNumber", "restaurantName"] },
  ORDER_DELIVERED: { name: "commerce_order_delivered", required: ["customerName", "orderNumber", "restaurantName"] },
  PAYMENT_COLLECTED: { name: "commerce_payment_receipt", required: ["customerName", "orderNumber", "restaurantName", "amount", "paymentMethod", "receiptUrl"] },
  RECEIPT_READY: { name: "commerce_payment_receipt", required: ["customerName", "orderNumber", "restaurantName", "amount", "paymentMethod", "receiptUrl"] },
};

export function whatsappProvider(): Provider {
  const provider = process.env.WHATSAPP_PROVIDER ?? "development";
  return provider === "meta" || provider === "manual" ? provider : "development";
}

export function redactedPhone(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length <= 4) return "redacted";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function normalizeWhatsappNumber(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (phone?.trim().startsWith("+")) return digits;
  const defaultCountry = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "971").replace(/\D/g, "");
  return digits.startsWith(defaultCountry) ? digits : `${defaultCountry}${digits}`;
}

export function whatsappLink(phone?: string | null, message = "") {
  const digits = normalizeWhatsappNumber(phone);
  if (!digits) return "";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

function templateVariables(metadata?: Prisma.InputJsonObject) {
  return (metadata?.templateVariables ?? metadata ?? {}) as Record<string, unknown>;
}

function validateTemplate(eventType: NotificationEventType, metadata?: Prisma.InputJsonObject) {
  const template = whatsappTemplates[eventType];
  if (!template) return { ok: true as const, templateName: undefined };
  const variables = templateVariables(metadata);
  const missing = template.required.filter((key) => variables[key] == null || variables[key] === "");
  if (missing.length) return { ok: false as const, templateName: template.name, message: `Missing template variables: ${missing.join(", ")}` };
  return { ok: true as const, templateName: template.name };
}

function dedupeKey(input: Pick<NotifyInput, "orderId" | "eventType">, channel: string, templateName?: string) {
  return `${input.orderId ?? "no-order"}:${input.eventType}:${channel}:${templateName ?? "no-template"}`;
}

function metaConfigReady() {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

async function submitMetaTemplate(recipient: string, templateName: string, metadata?: Prisma.InputJsonObject) {
  if (!metaConfigReady()) return { ok: false as const, status: "SKIPPED_NO_PROVIDER" as NotificationStatus, code: "META_NOT_CONFIGURED", message: "Meta WhatsApp configuration is incomplete." };
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en";
  const url = `https://graph.facebook.com/${apiVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const variables = templateVariables(metadata);
  const bodyValues = Object.values(variables).slice(0, 10).map((value) => ({ type: "text", text: String(value) }));
  const payload = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: bodyValues.length ? [{ type: "body", parameters: bodyValues }] : undefined,
    },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false as const, status: "FAILED" as NotificationStatus, code: String(json?.error?.code ?? response.status), message: String(json?.error?.message ?? "Meta WhatsApp submission failed.") };
  return { ok: true as const, providerMessageId: json?.messages?.[0]?.id ? String(json.messages[0].id) : undefined };
}

export async function notifyOrderEvent(input: NotifyInput) {
  const provider = whatsappProvider();
  const channel = provider === "meta" ? "whatsapp-cloud-api" : provider === "manual" ? "manual-whatsapp" : "development-log";
  const template = validateTemplate(input.eventType, input.metadata);
  const manualFallbackUrl = whatsappLink(input.recipient, input.message);
  const baseData = {
    companyId: input.companyId,
    orderId: input.orderId,
    eventType: input.eventType,
    channel,
    provider,
    templateName: template.templateName,
    recipient: input.recipient ? redactedPhone(input.recipient) : undefined,
    message: input.message,
    manualFallbackUrl: manualFallbackUrl || undefined,
    dedupeKey: dedupeKey(input, channel, template.templateName),
    metadataJson: { ...(input.metadata ?? {}), provider, redactedRecipient: redactedPhone(input.recipient), whatsappFallbackUrl: manualFallbackUrl },
  };
  const existing = await input.tx.notificationEvent.findUnique({ where: { dedupeKey: baseData.dedupeKey } });
  if (existing) return existing;
  if (input.consentGranted === false) {
    return input.tx.notificationEvent.create({ data: { ...baseData, status: "SKIPPED_NO_CONSENT", safeFailureMessage: "Customer did not consent to WhatsApp operational updates." } });
  }
  if (!template.ok) {
    return input.tx.notificationEvent.create({ data: { ...baseData, status: "FAILED_VALIDATION", safeFailureMessage: template.message } });
  }
  if (provider === "development") {
    console.info(`WhatsApp development notification prepared: ${input.eventType} to ${redactedPhone(input.recipient)}`);
    return input.tx.notificationEvent.create({ data: { ...baseData, status: "PENDING" } });
  }
  if (provider === "manual") {
    return input.tx.notificationEvent.create({ data: { ...baseData, status: manualFallbackUrl ? "READY_FOR_MANUAL_SEND" : "FAILED_VALIDATION", safeFailureMessage: manualFallbackUrl ? undefined : "Recipient mobile number is missing." } });
  }
  const created = await input.tx.notificationEvent.create({ data: { ...baseData, status: "SUBMITTING", attemptCount: 1 } });
  const submitted = await submitMetaTemplate(normalizeWhatsappNumber(input.recipient), template.templateName ?? "", input.metadata);
  if (!submitted.ok) {
    return input.tx.notificationEvent.update({ where: { id: created.id }, data: { status: submitted.status, failureCode: submitted.code, safeFailureMessage: submitted.message } });
  }
  return input.tx.notificationEvent.update({ where: { id: created.id }, data: { status: "SUBMITTED", providerMessageId: submitted.providerMessageId, submittedAt: new Date() } });
}

export function verifyWhatsappSignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  if (!signature || signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function updateNotificationStatus(tx: Prisma.TransactionClient, providerMessageId: string, nextStatus: NotificationStatus, failure?: { code?: string; message?: string }) {
  const existing = await tx.notificationEvent.findFirst({ where: { providerMessageId } });
  if (!existing) return null;
  if ((statusRank[existing.status] ?? 0) > (statusRank[nextStatus] ?? 0)) return existing;
  const now = new Date();
  return tx.notificationEvent.update({
    where: { id: existing.id },
    data: {
      status: nextStatus,
      deliveredAt: nextStatus === "DELIVERED" ? now : undefined,
      readAt: nextStatus === "READ" ? now : undefined,
      failureCode: failure?.code,
      safeFailureMessage: failure?.message,
    },
  });
}

export function receiptTemplateVariables(order: { customerNameSnapshot: string; orderNumber: string; totalAmount: unknown; paymentMethod: string; trackingToken: string; company: { name: string; currencyCode?: string | null; commerceSettings?: { displayName: string | null } | null } }) {
  const receiptUrl = `${appUrl()}/receipt/${order.orderNumber}?token=${order.trackingToken}`;
  return {
    customerName: order.customerNameSnapshot,
    orderNumber: order.orderNumber,
    restaurantName: order.company.commerceSettings?.displayName ?? order.company.name,
    amount: formatCommerceMoney(order.totalAmount as never, order.company.currencyCode),
    paymentMethod: order.paymentMethod.replaceAll("_", " "),
    receiptUrl,
  };
}
