import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { AppShell, EmptyState, Panel } from "../components/shell";
import { UploadForm } from "../components/forms";
import { UseInBusinessForm } from "../components/studio-actions";

export default async function MediaLibraryPage() {
  const [companies, campaigns, assets] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.studioCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.mediaAsset.findMany({ include: { company: true, campaign: true, product: true, placements: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return <AppShell title="Media Library"><div className="grid gap-5 lg:grid-cols-[360px_1fr]"><div className="space-y-5"><Panel><h2 className="mb-3 font-semibold">Upload media</h2><UploadForm companies={companies} /></Panel><Panel><h2 className="mb-3 font-semibold">Use in Business</h2><UseInBusinessForm media={assets} campaigns={campaigns} /></Panel></div>{assets.length === 0 ? <EmptyState title="No media uploaded" body="Upload or generate reusable content for campaigns and business placements." /> : <div className="space-y-4"><Panel><div className="grid gap-3 text-sm md:grid-cols-6"><span>Company</span><span>Campaign</span><span>Type</span><span>Category</span><span>Source</span><span>Approval</span></div></Panel><div className="grid gap-4 md:grid-cols-2">{assets.map((a) => <Panel key={a.id}><Link href={`/media-library/${a.id}`} className="font-semibold text-sky-700">{a.title}</Link><p className="mt-1 text-sm text-slate-500">{a.company.name} · {a.campaign?.name ?? "No campaign"} · {a.assetType} · {a.category}</p><p className="mt-1 text-xs text-slate-500">{a.sourceType} · {a.platform ?? "No platform"} · {a.approvalStatus} · {a.width ?? "-"}x{a.height ?? "-"}</p>{a.mimeType.startsWith("image/") && <img src={a.filePath} alt="" className="mt-3 aspect-video w-full rounded-md object-cover" />}{a.mimeType.startsWith("video/") && <video src={a.filePath} controls className="mt-3 aspect-video w-full rounded-md" />}<div className="mt-3 flex flex-wrap gap-2 text-xs"><a href={a.filePath} download className="rounded bg-slate-100 px-2 py-1">Download</a><span className="rounded bg-slate-100 px-2 py-1">Duplicate/adapt</span><span className="rounded bg-slate-100 px-2 py-1">Create platform version</span><span className="rounded bg-slate-100 px-2 py-1">Active placements: {a.placements.length}</span></div></Panel>)}</div></div>}</div></AppShell>;
}
