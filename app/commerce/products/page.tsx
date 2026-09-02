import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { formatCommerceMoney } from "@/modules/wave1/utils";
import { AppShell, EmptyState, Panel } from "../../components/shell";
import { AssetImage } from "../../components/asset-image";
import { CatalogueImportForm } from "../../components/commerce-actions";

export default async function ProductsPage() {
  const [products, company] = await Promise.all([
    prisma.product.findMany({ include: { company: true, category: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.company.findFirst({ where: { commerceEnabled: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  return <AppShell title="Products"><div className="mb-4 flex flex-wrap justify-end gap-2"><Link href="/commerce/products/new" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add Product</Link></div>{company && <Panel><h2 className="mb-4 font-semibold">Catalogue import / export</h2><CatalogueImportForm companyId={company.id} /></Panel>}<div className="mt-4">{products.length === 0 ? <EmptyState title="No products yet" body="Create products for a commerce-enabled company or import a workbook." /> : <Panel><table className="w-full text-sm"><tbody>{products.map((p) => <tr key={p.id} className="border-b border-slate-100"><td className="py-3 font-medium"><div className="flex items-center gap-3"><AssetImage src={p.imagePath} alt={`${p.name} product image`} className="h-20 w-28 rounded-md object-cover" /><div>{p.name}<div className="text-xs text-slate-500">{p.company.name} · {p.category?.name ?? "Unassigned"}</div></div></div></td><td>{formatCommerceMoney(p.promotionalPrice ?? p.regularPrice, p.company.currencyCode)}</td><td>{p.available ? "Available" : "Unavailable"}</td><td>{p.featured ? "Featured" : ""}</td></tr>)}</tbody></table></Panel>}</div></AppShell>;
}
