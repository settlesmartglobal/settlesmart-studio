import { prisma } from "@/core/database/prisma";
import { Prisma } from "@prisma/client";
import { creativeBrief, extractCampaignDetails, generatePlatformCopy, getBusinessContext, storyboardScenes } from "./intelligence";
import { createEnhancementJob, createExportPackage, renderPoster } from "./media";

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
      data: { companyId: campaign.companyId, campaignId, outputType: platform.includes("VIDEO") || platform === "REEL" ? "VIDEO" : "TEXT", platform, ...content, hashtagsJson: content.hashtags, reviewWarningsJson: content.reviewWarnings, contentJson: content, providerMode: process.env.STUDIO_AI_MODE ?? "demo" },
    });
  }));
  await prisma.studioCampaign.update({ where: { id: campaignId }, data: { status: "GENERATED" } });
  return rows;
}

export async function generatePoster(campaignId: string, platform: string, headline?: string, supportingText?: string) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const asset = await renderPoster(campaignId, platform, headline, supportingText);
  await prisma.campaignOutput.create({ data: { companyId: campaign.companyId, campaignId, mediaAssetId: asset.id, outputType: "POSTER", platform, headline: headline ?? campaign.name, subheadline: supportingText ?? campaign.objective, status: "DRAFT", providerMode: "demo", contentJson: { assetId: asset.id } } });
  return asset;
}

export async function generateStoryboard(campaignId: string, targetDuration?: string) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const context = await getBusinessContext(campaign.companyId);
  const details = (campaign.structuredInputJson ?? { title: campaign.name }) as Record<string, unknown>;
  const duration = targetDuration ?? (campaign.campaignType === "RECRUITMENT" ? "20-30" : "10-15");
  return prisma.storyboard.create({
    data: { companyId: campaign.companyId, campaignId, title: `${campaign.name} storyboard`, targetDuration: duration, scenes: { create: storyboardScenes(context, details, duration) } },
    include: { scenes: { orderBy: { sequenceNumber: "asc" } } },
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
