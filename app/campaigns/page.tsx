import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { AppShell, EmptyState, Panel } from "../components/shell";

export default async function CampaignsPage() {
  const campaigns = await prisma.studioCampaign.findMany({ include: { company: true, product: true }, orderBy: { createdAt: "desc" } });
  return <AppShell title="Campaigns"><div className="mb-4 flex justify-between"><p className="text-sm text-slate-500">AI content generation will be enabled in Wave 2.</p><Link href="/campaigns/new" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Create Campaign</Link></div>{campaigns.length === 0 ? <EmptyState title="No campaigns yet" body="Save basic campaign records for future Studio generation workflows." /> : <div className="grid gap-4 md:grid-cols-2">{campaigns.map((c) => <Panel key={c.id}><Link href={`/campaigns/${c.id}`} className="font-semibold text-sky-700">{c.name}</Link><p className="mt-1 text-sm text-slate-500">{c.company.name} · {c.campaignType} · {c.status}</p></Panel>)}</div>}</AppShell>;
}
