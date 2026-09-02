import { formatCommerceMoney } from "./utils";

type OptionSnapshot = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  priceDelta?: number | string | null;
};

type OrderItemSnapshot = {
  selectedOptionsJson?: unknown;
};

export function orderItemOptions(item: OrderItemSnapshot) {
  const options = item.selectedOptionsJson && typeof item.selectedOptionsJson === "object" ? item.selectedOptionsJson as { variant?: OptionSnapshot | null; addOns?: OptionSnapshot[]; instructions?: string } : {};
  return {
    variant: options.variant ?? null,
    addOns: Array.isArray(options.addOns) ? options.addOns : [],
    instructions: typeof options.instructions === "string" ? options.instructions : "",
  };
}

export function variantLabel(variant?: OptionSnapshot | null) {
  if (!variant?.name) return "";
  return [variant.name, variant.description].filter(Boolean).join(" - ");
}

export function addOnLabel(addOn: OptionSnapshot, currencyCode?: string | null) {
  const price = Number(addOn.price ?? addOn.priceDelta ?? 0);
  return `${addOn.name ?? "Add-on"}${price ? ` + ${formatCommerceMoney(price, currencyCode)}` : ""}`;
}
