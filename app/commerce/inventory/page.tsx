import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { customerAvailability } from "@/modules/wave1/inventory";
import { AppShell, EmptyState, Panel } from "../../components/shell";
import { InventoryControls, ProductActionBar } from "../../components/commerce-actions";

function statusLabel(state: string) {
  if (state === "SOLD_OUT") return "Sold Out";
  if (state === "UNAVAILABLE") return "Unavailable";
  return "Available";
}

export default async function InventoryPage() {
  const products = await prisma.product.findMany({ include: { company: true, category: true }, orderBy: [{ company: { name: "asc" } }, { displayOrder: "asc" }, { name: "asc" }] });
  return (
    <AppShell title="Inventory">
      <div className="mb-4 flex justify-end">
        <Link href="/commerce/products/new" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add Product</Link>
      </div>
      {products.length === 0 ? <EmptyState title="No products yet" body="Create products before managing inventory." /> : (
        <Panel>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="py-2">Product</th>
                <th>Availability</th>
                <th>Mode</th>
                <th>Current quantity</th>
                <th>Stock status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const state = customerAvailability(product);
                const lowStock = product.inventoryMode === "TRACK_QUANTITY" && product.lowStockThreshold != null && Number(product.inventoryQuantity ?? 0) <= product.lowStockThreshold && Number(product.inventoryQuantity ?? 0) > 0;
                return (
                  <tr key={product.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 font-medium">{product.name}<div className="text-xs text-slate-500">{product.company.name} · {product.category?.name ?? "Unassigned"}</div></td>
                    <td className="py-3">{statusLabel(state)}</td>
                    <td className="py-3">{product.inventoryMode.replaceAll("_", " ")}</td>
                    <td className="py-3">{product.inventoryMode === "TRACK_QUANTITY" ? product.inventoryQuantity ?? 0 : "Not tracked"}</td>
                    <td className="py-3">{state === "SOLD_OUT" ? "Sold out" : lowStock ? "Low stock" : "OK"}</td>
                    <td className="space-y-2 py-3">
                      <ProductActionBar productId={product.id} productSlug={product.slug} orderingSlug={product.company.orderingSlug} inStock={product.inStock} available={product.available} />
                      <InventoryControls productId={product.id} mode={product.inventoryMode} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </AppShell>
  );
}
