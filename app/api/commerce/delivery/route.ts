import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { deliveryZoneSchema } from "@/modules/wave1/schemas";

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? undefined;
  return NextResponse.json(await prisma.deliveryZone.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }));
}

export async function POST(req: Request) {
  const result = deliveryZoneSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const zone = await prisma.deliveryZone.create({ data: result.data });
  return NextResponse.json(zone, { status: 201 });
}
