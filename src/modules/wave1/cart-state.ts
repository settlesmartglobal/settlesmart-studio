export type CartOption = { id: string; name: string; description?: string | null; priceDelta?: number; price?: number };
export type CartItem = { productId: string; lineId: string; name: string; price: number; quantity: number; variantId?: string; variantName?: string; variantDescription?: string | null; addOns?: CartOption[]; instructions?: string };

export function buildCartLineId(productId: string, variantId?: string, addOnIds: string[] = [], instructions = "") {
  return [productId, variantId || "standard", [...addOnIds].sort().join(","), instructions.trim()].join("|");
}

export function upsertCartLine(current: CartItem[], line: Omit<CartItem, "quantity">) {
  const found = current.find((item) => item.lineId === line.lineId);
  if (found) return current.map((item) => item.lineId === line.lineId ? { ...item, quantity: item.quantity + 1 } : item);
  return [...current, { ...line, quantity: 1 }];
}

export function toggleGroupedSelection(current: string[], groupIds: string[], id: string, checked: boolean, maxSelect: number) {
  if (maxSelect === 1) return checked ? [...current.filter((value) => !groupIds.includes(value)), id] : current.filter((value) => value !== id);
  if (!checked) return current.filter((value) => value !== id);
  const selectedInGroup = current.filter((value) => groupIds.includes(value));
  if (selectedInGroup.length >= maxSelect) return current;
  return [...current, id];
}
