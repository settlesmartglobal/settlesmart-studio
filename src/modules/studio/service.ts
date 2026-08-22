import { prisma } from "@/core/database/prisma";
import { Prisma } from "@prisma/client";
import { creativeBrief, extractCampaignDetails, generatePlatformCopy, getBusinessContext, storyboardScenes } from "./intelligence";
import { createEnhancementJob, createExportPackage, renderPoster } from "./media";

type GeneratedCampaignOutput = ReturnType<typeof generatePlatformCopy>;

function toJsonCompatible(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map((item) => toJsonCompatible(item)) as Prisma.InputJsonArray;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toJsonCompatible(item)]),
    ) as Prisma.InputJsonObject;
  }
  return value as Prisma.InputJsonValue;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  const jsonValue = toJsonCompatible(value);
  if (jsonValue === null) return {};
  return jsonValue;
}

function toCampaignOutputCreateData(input: {
  companyId: string;
  campaignId: string;
  platform: string;
  generatedOutput: GeneratedCampaignOutput;
  providerMode?: string;
  providerName?: string;
  runMetadata?: Record<string, unknown>;
}): Prisma.CampaignOutputUncheckedCreateInput {
  const outputType = input.platform.includes("VIDEO") || input.platform === "REEL" ? "VIDEO" : "TEXT";
  const contentJson = toJsonValue({
    ...input.generatedOutput,
    platform: input.platform,
    outputType,
    providerMode: input.providerMode ?? "demo",
    providerName: input.providerName,
    runMetadata: input.runMetadata,
  });

  return {
    companyId: input.companyId,
    campaignId: input.campaignId,
    outputType,
    platform: input.platform,
    headline: input.generatedOutput.headline,
    subheadline: input.generatedOutput.subheadline,
    bodyCaption: input.generatedOutput.bodyCaption,
    cta: input.generatedOutput.cta,
    hashtagsJson: toJsonValue(input.generatedOutput.hashtags),
    altText: input.generatedOutput.altText,
    reviewWarningsJson: toJsonValue(input.generatedOutput.reviewWarnings),
    contentJson,
    providerMode: input.providerMode ?? "demo",
    providerName: input.providerName,
    runMetadataJson: input.runMetadata ? toJsonValue(input.runMetadata) : undefined,
  };
}

export async function extractAndStoreCampaign(input: { campaignId: string; rawInput?: string; sourceType: string; sourceReferenceId?: string }) {
  const extracted = await extractCampaignDetails(input.campaignId, input.rawInput);
  const record = await prisma.campaignInput.create({
    data: {
      companyId: extracted.campaign.companyId,
      campaignId: input.campaignId,
      campaignType: extracted.campaign.campaignType,
      sourceType: input.sourceType,
      sourceReferenceId: input.sourceReferenceId || undefined,
      rawInput: input.rawInput,
      structuredDetailsJson: extracted.details as Prisma.InputJsonObject,
      missingFieldsJson: extracted.missing,
    },
  });
  await prisma.studioCampaign.update({ where: { id: input.campaignId }, data: { structuredInputJson: extracted.details as Prisma.InputJsonObject, creativeBriefJson: creativeBrief(extracted.context, extracted.details) as Prisma.InputJsonObject, status: "READY_FOR_GENERATION" } });
  return record;
}

export async function approveCampaignInput(campaignId: string, structuredDetailsJson: Record<string, unknown>, approved: boolean) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  await prisma.campaignInput.updateMany({ where: { campaignId, companyId: campaign.companyId }, data: { structuredDetailsJson: structuredDetailsJson as Prisma.InputJsonObject, approved, approvedAt: approved ? new Date() : null } });
  return prisma.studioCampaign.update({ where: { id: campaignId }, data: { structuredInputJson: structuredDetailsJson as Prisma.InputJsonObject, inputApprovedAt: approved ? new Date() : null, status: approved ? "READY_FOR_GENERATION" : "DRAFT" } });
}

export async function generateContent(campaignId: string, platforms: string[]) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.inputApprovedAt) throw new Error("Approve extracted campaign details before generation");
  const context = await getBusinessContext(campaign.companyId);
  const details = (campaign.structuredInputJson ?? {}) as Record<string, unknown>;
  const rows = await Promise.all(platforms.map((platform) => {
    const content = generatePlatformCopy(platform, context, details);
    return prisma.campaignOutput.create({
      data: toCampaignOutputCreateData({
        companyId: campaign.companyId,
        campaignId,
        platform,
        generatedOutput: content,
        providerMode: process.env.STUDIO_AI_MODE ?? "demo",
      }),
    });
  }));
  await prisma.studioCampaign.update({ where: { id: campaignId }, data: { status: "GENERATED" } });
  return rows;
}

export async function generatePoster(campaignId: string, platform: string, headline?: string, supportingText?: string, quality?: "fast" | "balanced" | "premium", visualSource?: "ai" | "template") {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const asset = await renderPoster(campaignId, platform, headline, supportingText, quality, visualSource);
  const metadata = (asset.metadataJson ?? {}) as { provider?: string; model?: string; templateMode?: string };
  await prisma.campaignOutput.create({ data: { companyId: campaign.companyId, campaignId, mediaAssetId: asset.id, outputType: "POSTER", platform, headline: headline ?? campaign.name, subheadline: supportingText ?? campaign.objective, status: "DRAFT", providerMode: metadata.provider ?? metadata.templateMode ?? "demo", providerName: metadata.model, contentJson: { assetId: asset.id, visualSource: visualSource ?? "ai" } } });
  return asset;
}

export async function generateStoryboard(campaignId: string, targetDuration?: string, mediaAssetId?: string) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const context = await getBusinessContext(campaign.companyId);
  const visualReferenceSelect = { id: true, title: true, filePath: true, platform: true, sourceType: true } as const;
  const selectedVisualReference = mediaAssetId ? await prisma.mediaAsset.findFirst({
    where: { id: mediaAssetId, campaignId, companyId: campaign.companyId, assetType: { in: ["IMAGE", "POSTER", "BANNER"] } },
    select: visualReferenceSelect,
  }) : null;
  if (mediaAssetId && !selectedVisualReference) throw new Error("Selected storyboard media does not belong to this campaign.");
  const visualReference = selectedVisualReference ?? await prisma.mediaAsset.findFirst({
    where: { campaignId, companyId: campaign.companyId, assetType: { in: ["IMAGE", "POSTER", "BANNER"] }, approvalStatus: "APPROVED", sourceType: "UPLOADED" },
    orderBy: { updatedAt: "desc" },
    select: visualReferenceSelect,
  }) ?? await prisma.mediaAsset.findFirst({
    where: { campaignId, companyId: campaign.companyId, assetType: { in: ["IMAGE", "POSTER", "BANNER"] }, approvalStatus: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    select: visualReferenceSelect,
  }) ?? await prisma.mediaAsset.findFirst({
    where: { campaignId, companyId: campaign.companyId, assetType: { in: ["IMAGE", "POSTER", "BANNER"] } },
    orderBy: { updatedAt: "desc" },
    select: visualReferenceSelect,
  });
  const details = { ...((campaign.structuredInputJson ?? { title: campaign.name }) as Record<string, unknown>), visualReference };
  const duration = targetDuration ?? (campaign.campaignType === "RECRUITMENT" ? "20-30" : "10-15");
  return prisma.storyboard.create({
    data: { companyId: campaign.companyId, campaignId, title: `${campaign.name} storyboard`, targetDuration: duration, scenes: { create: storyboardScenes(context, details, duration) } },
    include: { scenes: { orderBy: { sequenceNumber: "asc" } } },
  });
}

export async function approveCampaign(campaignId: string) {
  const campaign = await prisma.studioCampaign.findUnique({
    where: { id: campaignId },
    include: { outputs: true },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.outputs.length === 0) throw new Error("Generate and review content before approval.");
  const now = new Date();
  await prisma.campaignOutput.updateMany({
    where: { campaignId, status: { not: "APPROVED" } },
    data: { status: "APPROVED", approvedAt: now },
  });
  return prisma.studioCampaign.update({
    where: { id: campaignId },
    data: { status: "APPROVED" },
    include: { outputs: true, mediaAssets: true, storyboards: { include: { scenes: { orderBy: { sequenceNumber: "asc" } } } } },
  });
}

export async function requestEnhancement(input: { companyId: string; mediaAssetId: string; operation: string; campaignId?: string }) {
  return createEnhancementJob(input.companyId, input.mediaAssetId, input.operation, input.campaignId);
}

export async function placeMedia(input: {
  companyId: string;
  mediaAssetId: string;
  campaignId?: string;
  productId?: string;
  placement: string;
  linkedTargetId?: string;
  cta?: string;
  destinationUrl?: string;
  startDate?: string;
  endDate?: string;
  displayOrder: number;
  active: boolean;
}) {
  const asset = await prisma.mediaAsset.findFirst({ where: { id: input.mediaAssetId, companyId: input.companyId } });
  if (!asset) throw new Error("Media asset not found for company");
  if (input.active && asset.approvalStatus !== "APPROVED") throw new Error("Only approved media can be activated in business placements");
  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, companyId: input.companyId } });
    if (!product) throw new Error("Product target does not belong to this company");
  }
  if (input.endDate && new Date(input.endDate) < new Date()) throw new Error("Expired placements cannot be activated");
  return prisma.mediaPlacement.create({ data: { ...input, placement: input.placement as never, campaignId: input.campaignId || undefined, productId: input.productId || undefined, linkedTargetId: input.linkedTargetId || undefined, cta: input.cta || undefined, destinationUrl: input.destinationUrl || undefined, startDate: input.startDate ? new Date(input.startDate) : undefined, endDate: input.endDate ? new Date(input.endDate) : undefined } });
}

export async function exportPlatforms(campaignId: string, platforms: string[]) {
  return createExportPackage(campaignId, platforms);
}
