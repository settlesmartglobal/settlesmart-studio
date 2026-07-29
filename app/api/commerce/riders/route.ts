import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { slugify } from "@/modules/wave1/utils";
import { z } from "zod";

const riderSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  mobile: z.string().min(6).max(40),
  email: z.string().email().optional().or(z.literal("")),
  vehicleType: z.string().max(80).optional().or(z.literal("")),
  vehicleNumber: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const result = riderSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const data = result.data;
  const rider = await prisma.rider.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      mobile: data.mobile,
      email: data.email || undefined,
      vehicleType: data.vehicleType || undefined,
      vehicleNumber: data.vehicleNumber || undefined,
      notes: data.notes || undefined,
      secureAccessCode: `${slugify(`${data.name}-${data.mobile}`)}-${Date.now().toString(36)}`,
    },
  });
  return NextResponse.json(rider, { status: 201 });
}
