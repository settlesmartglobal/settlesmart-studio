import { prisma } from "@/core/database/prisma";
import { AppShell, EmptyState, Panel } from "../../components/shell";

export default async function BrandAssetsPage() {
  const assets = await prisma.brandAsset.findMany({ include: { company: true }, orderBy: { createdAt: "desc" } });
  return <AppShell title="Brand Assets">{assets.length === 0 ? <EmptyState title="No uploaded brand assets" body="Upload logos, business cards, menus, brochures, and reference media from Brand Kit setup." /> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{assets.map((a) => <Panel key={a.id}><div className="font-semibold">{a.originalFilename}</div><p className="mt-1 text-sm text-slate-500">{a.company.name} · {a.assetType}</p><p className="mt-3 text-sm">{a.extractionStatus === "NOT_STARTED" ? "Pending Brand Analysis" : a.extractionStatus}</p><p className="text-sm">{a.approved ? "Approved" : "Not approved"}</p></Panel>)}</div>}</AppShell>;
}
