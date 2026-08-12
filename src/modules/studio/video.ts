import { prisma } from "@/core/database/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { storyboardScenes, getBusinessContext } from "./intelligence";
import { studioVideoConfig } from "./providers/config";
import { videoProvider } from "./providers/video";
import { writeGeneratedBuffer } from "./storage";

const reelTargets = {
  QUICK_REEL: { label: "10-15 seconds", targetSeconds: 12, clips: ["12"] },
  RECRUITMENT_REEL: { label: "20-30 seconds", targetSeconds: 24, clips: ["12", "12"] },
  PROMOTIONAL_VIDEO: { label: "30-60 seconds", targetSeconds: 36, clips: ["12", "12", "12"] },
} as const;

type ReelType = keyof typeof reelTargets;

function ffmpegConfigured() {
  return Boolean(process.env.FFMPEG_PATH);
}

function safeProviderError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500);
  return "Video provider request failed.";
}

export async function createStudioVideoJob(input: {
  campaignId: string;
  reelType: ReelType;
  style: string;
  format: "portrait" | "square" | "landscape";
  quality: "standard" | "premium";
}) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: input.campaignId }, include: { storyboards: { include: { scenes: { orderBy: { sequenceNumber: "asc" } } } } } });
  if (!campaign) throw new Error("Campaign not found");
  const context = await getBusinessContext(campaign.companyId);
  const target = reelTargets[input.reelType];
  const storyboard = campaign.storyboards[0] ?? { scenes: storyboardScenes(context, (campaign.structuredInputJson ?? { title: campaign.name }) as Record<string, unknown>, target.label) };
  const config = studioVideoConfig();
  const model = input.quality === "premium" ? config.premiumModel : config.model;
  const basePrompt = [
    `${input.reelType.replaceAll("_", " ")} for ${context.name}.`,
    `Business type: ${context.businessType}. Visual style: ${input.style}.`,
    `Campaign: ${campaign.name}. Objective: ${campaign.objective ?? ""}.`,
    `Use these scene concepts: ${storyboard.scenes.map((scene) => scene.visualRecommendation ?? scene.scenePurpose).join("; ")}.`,
    `Do not render critical marketing text; Studio will add captions and CTA overlays in final assembly.`,
  ].join("\n");
  const parentJob = await prisma.mediaProcessingJob.create({
    data: {
      companyId: campaign.companyId,
      campaignId: campaign.id,
      jobType: "VIDEO_ASSEMBLE",
      status: target.clips.length > 1 && !ffmpegConfigured() ? "PROCESSING" : "QUEUED",
      progress: 0,
      errorMessage: target.clips.length > 1 && !ffmpegConfigured() ? "Final assembly requires video worker." : undefined,
      configurationJson: {
        provider: videoProvider().name,
        model,
        reelType: input.reelType,
        targetSeconds: target.targetSeconds,
        clipCount: target.clips.length,
        orientation: input.format,
        prompt: basePrompt,
        assemblyRequired: target.clips.length > 1,
        assemblyReady: target.clips.length === 1 || ffmpegConfigured(),
      },
    },
  });
  const clipJobs = [];
  for (const [index, duration] of target.clips.entries()) {
    const scene = storyboard.scenes[index] ?? storyboard.scenes[storyboard.scenes.length - 1];
    const prompt = `${basePrompt}\nClip ${index + 1} of ${target.clips.length}. Focus on: ${scene?.visualRecommendation ?? scene?.scenePurpose ?? campaign.name}.`;
    const providerResult = await videoProvider().createVideo({ prompt, model, duration, orientation: input.format, quality: input.quality, campaignContext: campaign, storyboard });
    const failed = providerResult.status === "FAILED";
    const job = await prisma.mediaProcessingJob.create({
      data: {
        companyId: campaign.companyId,
        campaignId: campaign.id,
        jobType: "VIDEO_ENHANCE",
        status: providerResult.status,
        progress: 0,
        providerJobId: providerResult.providerJobId,
        errorMessage: failed ? safeProviderError(providerResult.metadata.message ?? providerResult.metadata.error) : undefined,
        failureCode: failed ? "VIDEO_PROVIDER_FAILED" : undefined,
        attempts: 1,
        lastAttemptAt: new Date(),
        configurationJson: {
          provider: providerResult.provider,
          parentJobId: parentJob.id,
          clipIndex: index,
          clipCount: target.clips.length,
          model: providerResult.model,
          size: providerResult.size,
          duration: providerResult.duration,
          prompt,
          ...providerResult.metadata,
        },
      },
    });
    clipJobs.push(job);
  }
  const hasFailedClip = clipJobs.some((job) => job.status === "FAILED");
  return prisma.mediaProcessingJob.update({
    where: { id: parentJob.id },
    data: {
      status: hasFailedClip ? "FAILED" : "PROCESSING",
      errorMessage: hasFailedClip ? "One or more video clips failed to start." : parentJob.errorMessage,
      configurationJson: { ...(parentJob.configurationJson as Record<string, unknown>), childJobIds: clipJobs.map((job) => job.id) },
    },
  });
}

export async function completeOpenAiVideoJob(providerJobId: string) {
  const job = await prisma.mediaProcessingJob.findUnique({ where: { providerJobId }, include: { campaign: true } });
  if (!job) return null;
  if (job.outputMediaAssetId) return job;
  const response = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(providerJobId)}/content`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 409 || response.status === 425 || response.status === 429 || response.status >= 500;
    return prisma.mediaProcessingJob.update({
      where: { id: job.id },
      data: {
        status: retryable ? "PROCESSING" : "FAILED",
        failureCode: retryable ? "VIDEO_DOWNLOAD_RETRYABLE" : "VIDEO_DOWNLOAD_FAILED",
        errorMessage: retryable ? "OpenAI video is not ready for download yet." : "OpenAI video download failed.",
        nextRetryAt: retryable ? new Date(Date.now() + 5 * 60 * 1000) : undefined,
      },
    });
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const stored = await writeGeneratedBuffer(job.companyId, "generated/video", `${randomUUID()}.mp4`, bytes);
  const config = (job.configurationJson ?? {}) as Record<string, unknown>;
  const asset = await prisma.mediaAsset.create({
    data: {
      companyId: job.companyId,
      campaignId: job.campaignId,
      title: `${job.campaign?.name ?? "Studio"} video clip ${Number(config.clipIndex ?? 0) + 1}`,
      assetType: "VIDEO",
      category: "SOCIAL",
      sourceType: "GENERATED",
      originalFilename: stored.storedFilename,
      storedFilename: stored.storedFilename,
      filePath: stored.filePath,
      mimeType: "video/mp4",
      fileSize: stored.fileSize,
      platform: "REEL",
      durationSeconds: Number(config.duration ?? 12),
      metadataJson: { provider: "openai", providerJobId, checksum: stored.checksum, parentJobId: String(config.parentJobId ?? ""), clipIndex: Number(config.clipIndex ?? 0), model: String(config.model ?? "") } as Prisma.InputJsonObject,
    },
  });
  const updated = await prisma.mediaProcessingJob.update({
    where: { id: job.id },
    data: { outputMediaAssetId: asset.id, status: "COMPLETED", progress: 100, completedAt: new Date(), failureCode: null, errorMessage: null },
  });
  await updateParentVideoAssembly(String(config.parentJobId ?? ""));
  return updated;
}

export async function failOpenAiVideoJob(providerJobId: string, message?: string) {
  return prisma.mediaProcessingJob.updateMany({
    where: { providerJobId },
    data: { status: "FAILED", failureCode: "VIDEO_PROVIDER_FAILED", errorMessage: message?.slice(0, 500) ?? "OpenAI video generation failed.", completedAt: new Date() },
  });
}

async function updateParentVideoAssembly(parentJobId: string) {
  if (!parentJobId) return;
  const parent = await prisma.mediaProcessingJob.findUnique({ where: { id: parentJobId } });
  if (!parent) return;
  const children = await prisma.mediaProcessingJob.findMany({ where: { configurationJson: { path: ["parentJobId"], equals: parentJobId } } });
  if (!children.length || children.some((job) => job.status !== "COMPLETED")) return;
  if (children.length === 1) {
    await prisma.mediaProcessingJob.update({ where: { id: parent.id }, data: { outputMediaAssetId: children[0].outputMediaAssetId, status: "COMPLETED", progress: 100, completedAt: new Date(), errorMessage: null } });
    return;
  }
  if (!ffmpegConfigured()) {
    await prisma.mediaProcessingJob.update({ where: { id: parent.id }, data: { status: "PROCESSING", progress: 75, errorMessage: "Final assembly requires video worker." } });
    return;
  }
  await prisma.mediaProcessingJob.update({ where: { id: parent.id }, data: { status: "PROCESSING", progress: 75, errorMessage: "Final assembly queued for video worker." } });
}
