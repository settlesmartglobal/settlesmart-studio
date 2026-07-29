import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { storeUpload } from "@/modules/wave1/storage";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const companyId = String(form.get("companyId") ?? "");
  const target = String(form.get("target") ?? "media");
  if (!(file instanceof File) || !companyId) {
    return NextResponse.json({ error: "File and companyId are required" }, { status: 400 });
  }

  try {
    const stored = await storeUpload(file, `${companyId}/${target}`);
    if (target === "brand") {
      const profile = await prisma.brandProfile.upsert({
        where: { companyId },
        create: { companyId },
        update: {},
      });
      const asset = await prisma.brandAsset.create({
        data: { companyId, brandProfileId: profile.id, assetType: "REFERENCE_IMAGE", ...stored },
      });
      return NextResponse.json(asset, { status: 201 });
    }
    const asset = await prisma.mediaAsset.create({
      data: {
        companyId,
        title: String(form.get("title") ?? stored.originalFilename),
        assetType: String(form.get("assetType") ?? "IMAGE") as never,
        category: String(form.get("category") ?? "BRAND") as never,
        productId: String(form.get("productId") || "") || undefined,
        ...stored,
      },
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
