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
    },
  });
  return NextResponse.json(asset);
}
