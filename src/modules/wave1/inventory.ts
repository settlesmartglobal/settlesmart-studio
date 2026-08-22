import { Prisma, type OrderStatus, type Product } from "@prisma/client";

export type CustomerAvailability = "AVAILABLE" | "SOLD_OUT" | "UNAVAILABLE";

type InventoryProduct = Pick<Product, "available" | "inStock" | "inventoryMode" | "inventoryQuantity">;

export const RESTOCKABLE_ORDER_STATUSES: OrderStatus[] = ["CANCELLED", "REJECTED"];

export function customerAvailability(product: InventoryProduct): CustomerAvailability {
  if (!product.available) return "UNAVAILABLE";
  if (product.inventoryMode === "TRACK_QUANTITY") {
    return Number(product.inventoryQuantity ?? 0) > 0 ? "AVAILABLE" : "SOLD_OUT";
  }
  if (product.inventoryMode === "AVAILABILITY_ONLY" && !product.inStock) return "UNAVAILABLE";
  return "AVAILABLE";
}

export function isOrderable(product: InventoryProduct) {
  return customerAvailability(product) === "AVAILABLE";
}

export function inventoryUnavailableMessage(product: Pick<Product, "name"> & InventoryProduct) {
  const state = customerAvailability(product);
  if (state === "SOLD_OUT") return `${product.name} is sold out.`;
  return `${product.name} is unavailable.`;
}

export async function reserveTrackedInventory(tx: Prisma.TransactionClient, items: Array<{ product: Product; quantity: number }>) {
  for (const item of items) {
    if (item.product.inventoryMode !== "TRACK_QUANTITY") continue;
    const result = await tx.product.updateMany({
      where: {
        id: item.product.id,
        inventoryMode: "TRACK_QUANTITY",
        available: true,
        inventoryQuantity: { gte: item.quantity },
      },
      data: { inventoryQuantity: { decrement: item.quantity } },
    });
    if (result.count !== 1) throw new Error(`${item.product.name} is sold out.`);
  }
}

export async function restoreTrackedInventoryForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order || order.inventoryRestoredAt) return;
  for (const item of order.items) {
    if (!item.product || item.product.inventoryMode !== "TRACK_QUANTITY") continue;
    await tx.product.update({
      where: { id: item.product.id },
      data: { inventoryQuantity: { increment: item.quantity } },
    });
  }
  await tx.order.update({ where: { id: orderId }, data: { inventoryRestoredAt: new Date() } });
}
