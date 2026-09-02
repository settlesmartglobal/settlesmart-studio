import { Prisma } from "@prisma/client";

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function money(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null || value === "") return 0;
  return Number(value);
}

export function formatMoney(value: Prisma.Decimal | number | string | null | undefined) {
  return money(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCommerceMoney(value: Prisma.Decimal | number | string | null | undefined, currencyCode?: string | null) {
  const code = (currencyCode || "AED").trim().toUpperCase();
  const fractionDigits = code === "OMR" ? 3 : new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
  const amount = money(value).toLocaleString("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  const prefixes: Record<string, string> = { INR: "₹", GBP: "£", USD: "$" };
  return `${prefixes[code] ?? code} ${amount}`;
}

export function normalizeOrderPrefix(value: string | null | undefined, fallbackName = "SS") {
  const normalized = (value || fallbackName)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return normalized.length >= 2 ? normalized : "SS";
}

export function haversineDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const radiusKm = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

export function statusTimestamp(status: string) {
  const now = new Date();
  return {
    acceptedAt: status === "ACCEPTED" ? now : undefined,
    preparingAt: status === "PREPARING" ? now : undefined,
    readyAt: status === "READY" ? now : undefined,
    pickedUpAt: status === "PICKED_UP" ? now : undefined,
    outForDeliveryAt: status === "OUT_FOR_DELIVERY" ? now : undefined,
    deliveredAt: status === "DELIVERED" ? now : undefined,
    completedAt: status === "COMPLETED" ? now : undefined,
    cancelledAt: status === "CANCELLED" || status === "REJECTED" ? now : undefined,
  };
}

const transitions: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["RIDER_ASSIGNED", "CANCELLED"],
  RIDER_ASSIGNED: ["PICKED_UP", "READY", "CANCELLED"],
  PICKED_UP: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["PAYMENT_COLLECTED"],
  PAYMENT_COLLECTED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string, fulfilmentType?: string) {
  if (from === to) return true;
  if (fulfilmentType === "PICKUP" && from === "READY" && to === "PAYMENT_COLLECTED") return true;
  if (fulfilmentType === "PICKUP" && ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(to)) return false;
  return transitions[from]?.includes(to) ?? false;
}
