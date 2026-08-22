export const commerceRolePermissions = {
  COMMERCE_OWNER: ["overview", "restaurant", "menu", "orders", "kitchen", "delivery", "customers", "promotions", "reports", "settings"],
  FRONT_DESK: ["orders", "customers"],
  KITCHEN: ["kitchen"],
  DISPATCH: ["delivery"],
  RIDER: ["delivery-mobile"],
} as const;

export function canAccessCommerceSection(role: string, section: string) {
  if (role === "SUPER_ADMIN" || role === "COMPANY_ADMIN") return true;
  return (commerceRolePermissions[role as keyof typeof commerceRolePermissions] as readonly string[] | undefined)?.includes(section) ?? false;
}
