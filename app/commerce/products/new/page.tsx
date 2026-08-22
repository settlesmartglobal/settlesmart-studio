import { prisma } from "@/core/database/prisma";
import { toClientCompanySummary } from "@/modules/wave1/serialization";
import { AppShell, Panel } from "../../../components/shell";
import { CommerceForm } from "../../../components/forms";

export default async function NewProductPage() {
  const [companies, categories] = await Promise.all([prisma.company.findMany({ orderBy: { name: "asc" } }), prisma.productCategory.findMany({ orderBy: { name: "asc" } })]);
  return <AppShell title="Add Product"><Panel><CommerceForm companies={companies.map(toClientCompanySummary)} categories={categories.map((category) => ({ id: category.id, name: category.name }))} /></Panel></AppShell>;
}
