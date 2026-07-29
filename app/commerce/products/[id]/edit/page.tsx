import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../../../components/shell";
import { ProductEditForm } from "../../../../components/commerce-actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { company: true } });
  if (!product) notFound();
  const categories = await prisma.productCategory.findMany({ where: { companyId: product.companyId }, orderBy: { name: "asc" } });
  return <AppShell title={`Edit ${product.name}`}><div className="mb-4"><Link href="/commerce?section=menu" className="text-sm font-semibold text-emerald-700">Back to Commerce menu</Link></div><Panel><ProductEditForm product={product} categories={categories} /></Panel></AppShell>;
}
