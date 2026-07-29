import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { brandProfileSchema } from "@/modules/wave1/schemas";

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? undefined;
  const profiles = await prisma.brandProfile.findMany({
    where: { companyId },
    include: { company: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(profiles);
}

export async function POST(req: Request) {
  const result = brandProfileSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const data = result.data;
  const profile = await prisma.brandProfile.upsert({
    where: { companyId: data.companyId },
    create: { ...data, approvedAt: data.approvalStatus === "APPROVED" ? new Date() : undefined },
    update: { ...data, approvedAt: data.approvalStatus === "APPROVED" ? new Date() : null },
  });
  return NextResponse.json(profile, { status: 201 });
}
