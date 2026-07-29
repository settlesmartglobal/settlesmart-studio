import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AppShell, EmptyState, Panel } from "../../components/shell";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ include: { company: true, category: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  return <AppShell title="Products"><div className="mb-4 flex justify-end"><Link href="/commerce/products/new" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add Product</Link></div>{products.length === 0 ? <EmptyState title="No products yet" body="Create menu items or products for a commerce-enabled company." /> : <Panel><table className="w-full text-sm"><tbody>{products.map((p) => <tr key={p.id} className="border-b border-slate-100"><td className="py-3 font-medium">{p.name}<div className="text-xs text-slate-500">{p.company.name} · {p.category?.name ?? "Unassigned"}</div></td><td>{p.promotionalPrice ? formatMoney(p.promotionalPrice) : formatMoney(p.regularPrice)}</td><td>{p.available ? "Available" : "Unavailable"}</td><td>{p.featured ? "Featured" : ""}</td></tr>)}</tbody></table></Panel>}</AppShell>;
}
