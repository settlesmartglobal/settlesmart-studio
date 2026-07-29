import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { CompanyService } from "@/modules/company/company.service";
import { updateCompanySchema } from "@/modules/company/company.schema";

const service = new CompanyService();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await service.get(id);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = updateCompanySchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });

  try {
    const company = await service.update(id, result.data);
    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Company not found" }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ error: "Company slug or ordering slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to update company" }, { status: 500 });
  }
}
