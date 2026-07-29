import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { placementSchema } from "@/modules/studio/schemas";
import { placeMedia } from "@/modules/studio/service";

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? undefined;
  const now = new Date();
  return NextResponse.json(await prisma.mediaPlacement.findMany({
    where: { companyId, OR: [{ endDate: null }, { endDate: { gte: now } }] },
    include: { mediaAsset: true, campaign: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  }));
}

export async function POST(req: Request) {
  const result = placementSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await placeMedia({ ...result.data, campaignId: result.data.campaignId || undefined, productId: result.data.productId || undefined }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Placement failed" }, { status: 400 });
  }
}
