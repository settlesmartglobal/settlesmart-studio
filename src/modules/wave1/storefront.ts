export function commerceBaseUrl() {
  return (process.env.NEXT_PUBLIC_COMMERCE_ORDER_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function commerceStoreUrl(orderingSlug: string) {
  return `${commerceBaseUrl()}/order/${orderingSlug}`;
}

export function whatsappStoreShareUrl(businessName: string, storeUrl: string) {
  const message = `Order directly from ${businessName}:\n${storeUrl}\n\nNo app download required. Open the link and place your order.`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
