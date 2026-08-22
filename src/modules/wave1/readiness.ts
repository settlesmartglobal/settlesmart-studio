type ReadinessCompany = {
  name: string;
  orderingSlug?: string | null;
  commerceSettings?: {
    displayName?: string | null;
    logoPath?: string | null;
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    cashPaymentEnabled: boolean;
    cardOnDeliveryEnabled: boolean;
    onlinePaymentEnabled: boolean;
    acceptingOrders: boolean;
  } | null;
  branches: Array<{ active: boolean; hours: unknown[] }>;
  productCategories: Array<{ active: boolean; products: Array<{ available: boolean; inStock: boolean }> }>;
};

export type ReadinessItem = { group: string; label: string; ok: boolean; missing: string };

export function commerceReadiness(company: ReadinessCompany, storeUrl: string): { status: "READY TO ACCEPT ORDERS" | "SETUP INCOMPLETE"; percent: number; items: ReadinessItem[] } {
  const items: ReadinessItem[] = [
    { group: "Business profile", label: "Business details", ok: Boolean(company.commerceSettings?.displayName ?? company.name), missing: "Add a business display name." },
    { group: "Business profile", label: "Logo", ok: Boolean(company.commerceSettings?.logoPath), missing: "Add a logo path or approved logo." },
    { group: "Catalogue", label: "At least one category", ok: company.productCategories.some((category) => category.active), missing: "Create an active category." },
    { group: "Catalogue", label: "At least one active product", ok: company.productCategories.some((category) => category.products.some((product) => product.available && product.inStock)), missing: "Create an available product." },
    { group: "Operations", label: "Opening hours", ok: company.branches.some((branch) => branch.active && branch.hours.length > 0), missing: "Configure opening hours." },
    { group: "Operations", label: "Payment method", ok: Boolean(company.commerceSettings?.cashPaymentEnabled || company.commerceSettings?.cardOnDeliveryEnabled || company.commerceSettings?.onlinePaymentEnabled), missing: "Enable at least one payment method." },
    { group: "Operations", label: "Delivery or pickup enabled", ok: Boolean(company.commerceSettings?.deliveryEnabled || company.commerceSettings?.pickupEnabled), missing: "Enable delivery or pickup." },
    { group: "Customer store", label: "Ordering URL", ok: Boolean(company.orderingSlug && storeUrl), missing: "Set an ordering slug." },
    { group: "Customer store", label: "QR generated", ok: Boolean(company.orderingSlug && storeUrl), missing: "Set an ordering slug to generate the QR." },
  ];
  const passed = items.filter((item) => item.ok).length;
  return {
    status: items.every((item) => item.ok) && company.commerceSettings?.acceptingOrders !== false ? "READY TO ACCEPT ORDERS" : "SETUP INCOMPLETE",
    percent: Math.round((passed / items.length) * 100),
    items,
  };
}
