import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { AppShell, EmptyState, Panel } from "../components/shell";

export default async function BrandKitPage() {
  const profiles = await prisma.brandProfile.findMany({ include: { company: true }, orderBy: { updatedAt: "desc" } });
  return <AppShell title="Brand Kit"><div className="mb-4 flex gap-3"><Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/brand-kit/setup">Set Up Brand Kit</Link><Link className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold" href="/brand-kit/assets">Assets</Link></div>{profiles.length === 0 ? <EmptyState title="No Brand Kit yet" body="Configure colors, logo, tone, and reusable brand settings." /> : <div className="grid gap-4 lg:grid-cols-2">{profiles.map((p) => <Panel key={p.id}><div className="flex items-center gap-3"><div className="size-12 rounded-md" style={{ background: p.primaryColor }} /><div><h2 className="font-semibold">{p.company.name}</h2><p className="text-sm text-slate-500">{p.tagline || "No tagline"} · {p.approvalStatus}</p></div></div><div className="mt-4 flex gap-2">{[p.primaryColor,p.secondaryColor,p.accentColor,p.backgroundColor].map((c) => <span key={c} title={c} className="size-8 rounded border border-slate-200" style={{ background: c }} />)}</div></Panel>)}</div>}</AppShell>;
}
