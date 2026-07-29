import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma";
import { productSchema } from "@/modules/wave1/schemas";

const clean = (value: unknown) => (value === "" ? undefined : value);

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? undefined;
  return NextResponse.json(await prisma.product.findMany({ where: { companyId }, include: { category: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }));
}

export async function POST(req: Request) {
  const result = productSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const data = result.data;
  try {
    const product = await prisma.product.create({
      data: {
        ...data,
        categoryId: clean(data.categoryId) as string | undefined,
        promotionalPrice: clean(data.promotionalPrice) as number | undefined,
        preparationMinutes: clean(data.preparationMinutes) as number | undefined,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Product slug already exists for this company" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create product" }, { status: 500 });
  }
}
