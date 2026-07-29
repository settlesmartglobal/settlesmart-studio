import { mkdir, writeFile, copyFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@/core/database/prisma";
import { getBusinessContext } from "./intelligence";

const execFileAsync = promisify(execFile);

const sizes: Record<string, { width: number; height: number }> = {
  INSTAGRAM: { width: 1080, height: 1350 },
  INSTAGRAM_STORY: { width: 1080, height: 1920 },
  REEL: { width: 1080, height: 1920 },
  SHORT_VIDEO: { width: 1080, height: 1920 },
  SQUARE: { width: 1080, height: 1080 },
  FACEBOOK: { width: 1200, height: 628 },
  LINKEDIN: { width: 1200, height: 628 },
  WHATSAPP: { width: 1080, height: 1350 },
  BANNER: { width: 1600, height: 600 },
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char));
}

function wrap(text: string, limit: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > limit) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

export async function writeGeneratedAsset(companyId: string, folder: string, filename: string, content: string) {
  const uploadRoot = process.env.UPLOAD_DIR ?? "public/uploads";
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const absoluteDir = path.resolve(cwd, uploadRoot, companyId, folder);
  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, filename);
  await writeFile(absolutePath, content);
  const filePath = `/${path.relative(path.join(cwd, "public"), absolutePath).replaceAll(path.sep, "/")}`;
  return { filePath, storedFilename: filename, absolutePath };
}

export async function renderPoster(campaignId: string, platform: string, headline?: string, supportingText?: string) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const context = await getBusinessContext(campaign.companyId);
  const size = sizes[platform] ?? sizes.INSTAGRAM;
  const title = headline ?? campaign.name;
  const support = supportingText ?? campaign.objective ?? context.brand.tagline ?? context.description;
  const lines = wrap(support, platform === "BANNER" ? 70 : 36);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <rect width="100%" height="100%" fill="${context.brand.backgroundColor}"/>
  <rect x="0" y="0" width="${size.width}" height="${Math.round(size.height * 0.34)}" fill="${context.brand.primaryColor}"/>
  <circle cx="${size.width - 160}" cy="150" r="95" fill="${context.brand.accentColor}" opacity=".95"/>
  <text x="72" y="120" fill="#fff" font-family="Arial" font-size="34" font-weight="700">${escapeXml(context.name)}</text>
  <text x="72" y="${Math.round(size.height * 0.42)}" fill="#111827" font-family="Arial" font-size="${platform === "BANNER" ? 64 : 72}" font-weight="800">${escapeXml(title)}</text>
  ${lines.map((line, index) => `<text x="72" y="${Math.round(size.height * 0.52) + index * 52}" fill="#334155" font-family="Arial" font-size="34">${escapeXml(line)}</text>`).join("")}
  <rect x="72" y="${size.height - 190}" rx="18" width="${Math.min(620, size.width - 144)}" height="88" fill="${context.brand.accentColor}"/>
  <text x="110" y="${size.height - 134}" fill="#fff" font-family="Arial" font-size="34" font-weight="700">${escapeXml(context.brand.defaultCta || "Contact us today")}</text>
  <text x="72" y="${size.height - 56}" fill="#475569" font-family="Arial" font-size="28">${escapeXml(context.orderingUrl || context.brand.socials.whatsapp || context.location)}</text>
</svg>`;
  const stored = await writeGeneratedAsset(campaign.companyId, "generated", `${randomUUID()}.svg`, svg);
  const asset = await prisma.mediaAsset.create({
    data: {
      companyId: campaign.companyId,
      campaignId,
      productId: campaign.productId,
      title: `${campaign.name} ${platform} poster`,
      assetType: platform === "BANNER" ? "BANNER" : "POSTER",
      category: campaign.campaignType === "RECRUITMENT" ? "RECRUITMENT" : "SOCIAL",
      sourceType: "GENERATED",
      originalFilename: stored.storedFilename,
      storedFilename: stored.storedFilename,
      filePath: stored.filePath,
      mimeType: "image/svg+xml",
      fileSize: Buffer.byteLength(svg),
      platform,
      width: size.width,
      height: size.height,
      metadataJson: { templateMode: "demo-svg", providerMode: process.env.STUDIO_AI_MODE ?? "demo" },
    },
  });
  await prisma.mediaProcessingJob.create({ data: { companyId: campaign.companyId, campaignId, outputMediaAssetId: asset.id, jobType: "POSTER_RENDER", status: "COMPLETED", progress: 100, completedAt: new Date() } });
  return asset;
}

export async function createEnhancementJob(companyId: string, mediaAssetId: string, operation: string, campaignId?: string) {
  const input = await prisma.mediaAsset.findFirst({ where: { id: mediaAssetId, companyId } });
  if (!input) throw new Error("Media asset not found for company");
  const jobType = input.mimeType.startsWith("video/") ? "VIDEO_ENHANCE" : operation === "RESIZE_FOR_PLATFORMS" ? "IMAGE_RESIZE" : "IMAGE_ENHANCE";
  const ffmpegAvailable = await detectFfmpeg();
  if (input.mimeType.startsWith("video/") && !ffmpegAvailable) {
    return prisma.mediaProcessingJob.create({ data: { companyId, campaignId: campaignId || input.campaignId, inputMediaAssetId: input.id, jobType, status: "QUEUED", progress: 0, configurationJson: { operation, message: "FFmpeg is not configured. Job is queued for a worker-enabled environment." } } });
  }
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const source = path.join(cwd, "public", input.filePath.replace(/^\//, ""));
  const ext = input.storedFilename.split(".").pop() ?? "bin";
  const stored = await writeGeneratedAsset(companyId, "enhanced", `${randomUUID()}.${ext}`, "");
  await copyFile(source, stored.absolutePath);
  const output = await prisma.mediaAsset.create({ data: { companyId, campaignId: campaignId || input.campaignId, productId: input.productId, parentAssetId: input.id, title: `${input.title} enhanced`, assetType: input.assetType, category: input.category, sourceType: "ENHANCED", originalFilename: input.originalFilename, storedFilename: stored.storedFilename, filePath: stored.filePath, mimeType: input.mimeType, fileSize: input.fileSize, platform: input.platform, metadataJson: { operation, preservedOriginal: input.id } } });
  return prisma.mediaProcessingJob.create({ data: { companyId, campaignId: campaignId || input.campaignId, inputMediaAssetId: input.id, outputMediaAssetId: output.id, jobType, status: "COMPLETED", progress: 100, completedAt: new Date(), configurationJson: { operation, demoMode: true } } });
}

export async function detectFfmpeg() {
  const binary = process.env.FFMPEG_PATH || "ffmpeg";
  try {
    await execFileAsync(binary, ["-version"], { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

export async function createExportPackage(campaignId: string, platforms: string[]) {
  const campaign = await prisma.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const outputs = await prisma.campaignOutput.findMany({ where: { campaignId, platform: { in: platforms } }, include: { mediaAsset: true } });
  const payload = JSON.stringify({ campaign: campaign.name, platforms, outputs }, null, 2);
  const stored = await writeGeneratedAsset(campaign.companyId, "exports", `${randomUUID()}.json`, payload);
  return prisma.mediaAsset.create({ data: { companyId: campaign.companyId, campaignId, title: `${campaign.name} platform export`, assetType: "DOCUMENT", category: "SOCIAL", sourceType: "GENERATED", originalFilename: stored.storedFilename, storedFilename: stored.storedFilename, filePath: stored.filePath, mimeType: "application/json", fileSize: Buffer.byteLength(payload), metadataJson: { platforms } } });
}
