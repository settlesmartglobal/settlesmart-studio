import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { storeUpload } from "@/modules/wave1/storage";
import sharp from "sharp";

const logoMimeTypes = ["image/png", "image/svg+xml", "image/webp"];
const faviconMimeTypes = ["image/png", "image/svg+xml", "image/x-icon"];
const manualImageMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const platformSizes: Record<string, { width: number; height: number; label: string }> = {
  INSTAGRAM: { width: 1080, height: 1350, label: "Instagram Portrait" },
  INSTAGRAM_SQUARE: { width: 1080, height: 1080, label: "Instagram Post" },
  INSTAGRAM_STORY: { width: 1080, height: 1920, label: "Instagram Story" },
  FACEBOOK: { width: 1200, height: 630, label: "Facebook Post" },
  LINKEDIN: { width: 1200, height: 627, label: "LinkedIn Post" },
  WHATSAPP: { width: 1080, height: 1080, label: "WhatsApp Creative" },
};

async function imageMetadata(file: File, platform: string) {
  if (!manualImageMimeTypes.includes(file.type)) return {};
  const metadata = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
  const recommended = platformSizes[platform];
  const width = metadata.width;
  const height = metadata.height;
  const dimensionWarning = recommended && width && height && (width !== recommended.width || height !== recommended.height)
    ? `${recommended.label} recommends ${recommended.width}x${recommended.height}; uploaded file is ${width}x${height}.`
    : undefined;
  return { width, height, recommended, dimensionWarning };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const companyId = String(form.get("companyId") ?? "");
  const target = String(form.get("target") ?? "media");
  const brandField = String(form.get("brandField") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (target !== "brand" && !companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const isFavicon = brandField === "faviconPath";
    const folderCompany = companyId || "draft";
    const platform = String(form.get("platform") ?? "");
    const assetType = String(form.get("assetType") ?? "IMAGE");
    const isManualImage = target === "media" && ["IMAGE", "POSTER", "BANNER"].includes(assetType);
    const meta = isManualImage ? await imageMetadata(file, platform) : {};
    const stored = await storeUpload(file, `${folderCompany}/${target}`, target === "brand" ? { maxMb: isFavicon ? 2 : 5, allowedMimeTypes: isFavicon ? faviconMimeTypes : logoMimeTypes } : isManualImage ? { maxMb: 10, allowedMimeTypes: manualImageMimeTypes } : {});
    if (target === "brand") {
      if (!companyId) return NextResponse.json({ ...stored, brandField }, { status: 201 });
      const profile = await prisma.brandProfile.upsert({
        where: { companyId },
        create: { companyId },
        update: {},
      });
      const asset = await prisma.brandAsset.create({
        data: { companyId, brandProfileId: profile.id, assetType: "LOGO", ...stored },
      });
      return NextResponse.json(asset, { status: 201 });
    }
    const campaignId = String(form.get("campaignId") || "") || undefined;
    const productId = String(form.get("productId") || "") || undefined;
    if (campaignId) {
      const campaign = await prisma.studioCampaign.findFirst({ where: { id: campaignId, companyId } });
      if (!campaign) return NextResponse.json({ error: "Campaign does not belong to selected company" }, { status: 400 });
    }
    if (productId) {
      const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
      if (!product) return NextResponse.json({ error: "Product does not belong to selected company" }, { status: 400 });
    }
    const metadataJson = {
      sourceLabel: "Uploaded",
      uploadFlow: "manual-poster",
      caption: String(form.get("description") ?? ""),
      platformRecommendation: "recommended" in meta ? meta.recommended : undefined,
      dimensionWarning: "dimensionWarning" in meta ? meta.dimensionWarning : undefined,
    };
    const asset = await prisma.mediaAsset.create({
      data: {
        companyId,
        campaignId,
        productId,
        title: String(form.get("title") ?? stored.originalFilename),
        description: String(form.get("description") ?? "") || undefined,
        assetType: assetType as never,
        category: String(form.get("category") ?? "BRAND") as never,
        sourceType: "UPLOADED",
        platform: platform || undefined,
        width: "width" in meta ? meta.width : undefined,
        height: "height" in meta ? meta.height : undefined,
        metadataJson,
        ...stored,
      },
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
