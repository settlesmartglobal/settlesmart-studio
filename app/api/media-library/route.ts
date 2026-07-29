import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const companyId = params.get("companyId") ?? undefined;
  const assetType = params.get("assetType") ?? undefined;
  const category = params.get("category") ?? undefined;
  const approvalStatus = params.get("approvalStatus") ?? undefined;
  return NextResponse.json(
    await prisma.mediaAsset.findMany({
      where: { companyId, assetType: assetType as never, category: category as never, approvalStatus: approvalStatus as never },
      include: { company: true, product: true },
      orderBy: { createdAt: "desc" },
    }),
  );
}
