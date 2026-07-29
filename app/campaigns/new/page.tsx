import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../components/shell";
import { CampaignForm } from "../../components/forms";

export default async function NewCampaignPage() {
  const [companies, products] = await Promise.all([prisma.company.findMany({ orderBy: { name: "asc" } }), prisma.product.findMany({ orderBy: { name: "asc" } })]);
  return <AppShell title="Create Campaign"><Panel><CampaignForm companies={companies} products={products} /></Panel></AppShell>;
}
