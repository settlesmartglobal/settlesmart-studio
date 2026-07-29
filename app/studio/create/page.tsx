import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../components/shell";
import { StudioWizard } from "../../components/studio-actions";

export default async function StudioCreatePage() {
  const [companies, campaigns] = await Promise.all([
    prisma.company.findMany({ include: { brandProfile: true }, orderBy: { name: "asc" } }),
    prisma.studioCampaign.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return <AppShell title="AI Content Studio"><Panel><h2 className="text-lg font-semibold">Create once. Approve once. Use everywhere.</h2><p className="mt-2 text-sm text-slate-500">Demo intelligence mode is deterministic and safe without external AI credentials.</p></Panel><div className="mt-5"><StudioWizard companies={companies} campaigns={campaigns} /></div></AppShell>;
}
