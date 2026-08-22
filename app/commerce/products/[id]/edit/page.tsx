import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { toClientProduct } from "@/modules/wave1/serialization";
import { AppShell, Panel } from "../../../../components/shell";
import { ProductEditForm } from "../../../../components/commerce-actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { company: true, variants: { orderBy: { displayOrder: "asc" } } } });
  if (!product) notFound();
  const categories = await prisma.productCategory.findMany({ where: { companyId: product.companyId }, orderBy: { name: "asc" } });
  return <AppShell title={`Edit ${product.name}`}><div className="mb-4"><Link href="/commerce?section=menu" className="text-sm font-semibold text-emerald-700">Back to Commerce menu</Link></div><Panel><ProductEditForm product={toClientProduct(product)} categories={categories.map((category) => ({ id: category.id, name: category.name }))} /></Panel></AppShell>;
}
