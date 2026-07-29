import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../components/shell";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.studioCampaign.findUnique({
    where: { id },
    include: {
      company: { include: { brandProfile: true } },
      product: true,
      inputs: { orderBy: { createdAt: "desc" } },
      outputs: { include: { mediaAsset: true }, orderBy: { createdAt: "desc" } },
      storyboards: { include: { scenes: { orderBy: { sequenceNumber: "asc" } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!campaign) notFound();
  const groups = ["All Outputs", "Instagram", "Facebook", "LinkedIn", "WhatsApp", "Reels", "Short Video"];
  return <AppShell title={campaign.name}><div className="mb-5 flex flex-wrap gap-3"><Link href="/studio/create" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Open in AI Content Studio</Link><span className="rounded-md bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">{campaign.status}</span></div><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="space-y-5"><Panel><h2 className="font-semibold">Platform outputs</h2><div className="mt-4 flex flex-wrap gap-2">{groups.map((g) => <span key={g} className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold">{g}</span>)}</div><div className="mt-5 grid gap-4 md:grid-cols-2">{campaign.outputs.map((o) => <article key={o.id} className="rounded-lg border border-slate-200 p-4"><div className="text-xs font-semibold uppercase text-slate-500">{o.platform} · {o.outputType}</div><h3 className="mt-2 font-semibold">{o.headline}</h3><p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{o.bodyCaption}</p><p className="mt-3 text-sm font-semibold">{o.cta}</p>{o.mediaAsset && <a href={o.mediaAsset.filePath} download className="mt-3 inline-flex text-sm text-sky-700">Download</a>}<div className="mt-3 flex gap-2 text-xs"><span className="rounded bg-slate-100 px-2 py-1">Edit</span><span className="rounded bg-slate-100 px-2 py-1">Regenerate</span><span className="rounded bg-slate-100 px-2 py-1">Approve</span><span className="rounded bg-slate-100 px-2 py-1">Use in Business</span></div></article>)}</div></Panel><Panel><h2 className="font-semibold">Storyboards</h2>{campaign.storyboards.map((s) => <div key={s.id} className="mt-4"><b>{s.title}</b><p className="text-sm text-slate-500">{s.targetDuration} seconds · {s.status}</p>{s.scenes.map((scene) => <div key={scene.id} className="mt-3 rounded-md border border-slate-200 p-3 text-sm"><b>{scene.sequenceNumber}. {scene.scenePurpose}</b><p>{scene.visualRecommendation}</p><p className="text-slate-500">{scene.headlineCaption}</p></div>)}</div>)}</Panel></div><aside className="space-y-5"><Panel><h2 className="font-semibold">Business context</h2><p className="mt-2 text-sm text-slate-500">{campaign.company.name} · {campaign.company.businessType}</p><p className="mt-2 text-sm">{campaign.company.brandProfile?.approvalStatus === "APPROVED" ? "Approved Brand Kit" : "Safe default styling"}</p></Panel><Panel><h2 className="font-semibold">Structured input</h2><pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-white">{JSON.stringify(campaign.structuredInputJson ?? campaign.inputs[0]?.structuredDetailsJson ?? {}, null, 2)}</pre></Panel></aside></div></AppShell>;
}
