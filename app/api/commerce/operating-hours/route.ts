import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { operatingHoursSchema } from "@/modules/wave1/schemas";

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? undefined;
  return NextResponse.json(await prisma.operatingHours.findMany({ where: { companyId }, orderBy: { dayOfWeek: "asc" } }));
}

export async function POST(req: Request) {
  const result = operatingHoursSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const rows = await prisma.$transaction(
    result.data.days.map((day) =>
      prisma.operatingHours.upsert({
        where: { companyId_dayOfWeek: { companyId: result.data.companyId, dayOfWeek: day.dayOfWeek } },
        create: { companyId: result.data.companyId, ...day },
        update: day,
      }),
    ),
  );
  return NextResponse.json(rows, { status: 201 });
}
