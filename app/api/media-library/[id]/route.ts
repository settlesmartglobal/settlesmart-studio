import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { mediaStatusSchema } from "@/modules/wave1/schemas";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = mediaStatusSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const asset = await prisma.mediaAsset.update({
    where: { id },
    data: {
      approvalStatus: result.data.approvalStatus,
      approvedAt: result.data.approvalStatus === "APPROVED" ? new Date() : null,
      approvedBy: result.data.approvalStatus === "APPROVED" ? result.data.approvedBy || "single-admin" : null,
      approvalNotes: result.data.approvalNotes || undefined,
      approvedForExternalUse: result.data.approvalStatus === "APPROVED",
      usageType: result.data.usageType,
    },
  });
  return NextResponse.json(asset);
}
