import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../../components/shell";
import { CompanyForm } from "../../../components/forms";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) notFound();
  return <AppShell title={`Edit ${company.name}`}><Panel><CompanyForm company={company} /></Panel></AppShell>;
}
