import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma";
import { categorySchema } from "@/modules/wave1/schemas";

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? undefined;
  return NextResponse.json(await prisma.productCategory.findMany({ where: { companyId }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }));
}

export async function POST(req: Request) {
  const result = categorySchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    const category = await prisma.productCategory.create({ data: result.data });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Category slug already exists for this company" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create category" }, { status: 500 });
  }
}
