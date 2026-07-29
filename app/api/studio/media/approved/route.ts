import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { approvedMediaQuerySchema } from "@/modules/studio/schemas";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const result = approvedMediaQuerySchema.safeParse(Object.fromEntries(params));
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const { companyId, campaignId, mediaType, platform, usageType } = result.data;

  const assets = await prisma.mediaAsset.findMany({
    where: {
      companyId,
      campaignId,
      assetType: mediaType as never,
      platform,
      usageType: usageType as never,
      approvalStatus: "APPROVED",
      approvedForExternalUse: true,
    },
    include: { campaign: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(assets.map((asset) => ({
    id: asset.id,
    companyId: asset.companyId,
    campaignId: asset.campaignId,
    title: asset.title,
    description: asset.description,
    mediaType: asset.assetType,
    platform: asset.platform,
    fileUrl: asset.filePath,
    thumbnailUrl: asset.filePath,
    width: asset.width,
    height: asset.height,
    duration: asset.durationSeconds,
    tags: asset.tagsJson,
    approvalStatus: asset.approvalStatus,
    approvedAt: asset.approvedAt,
    usageType: asset.usageType,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  })));
}
