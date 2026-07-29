import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../components/shell";
import { BrandForm, UploadForm } from "../../components/forms";

export default async function BrandSetupPage() {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return <AppShell title="Set Up Brand Kit"><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><Panel><BrandForm companies={companies} /></Panel><Panel><h2 className="mb-3 font-semibold">Upload logo or references</h2><UploadForm companies={companies} target="brand" /></Panel></div></AppShell>;
}
