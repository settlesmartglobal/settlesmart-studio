import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../components/shell";

export default async function MediaAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id }, include: { company: true, product: true } });
  if (!asset) notFound();
  return <AppShell title={asset.title}><Panel><p className="text-sm text-slate-500">{asset.company.name} · {asset.assetType} · {asset.category} · {asset.approvalStatus}</p>{asset.mimeType.startsWith("image/") && <img src={asset.filePath} alt="" className="mt-5 max-h-[520px] rounded-md" />}{asset.mimeType.startsWith("video/") && <video src={asset.filePath} controls className="mt-5 max-h-[520px] rounded-md" />}<a href={asset.filePath} download className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Download</a></Panel></AppShell>;
}
