import { NextResponse } from "next/server";
import { CompanyService } from "../../../src/modules/company/company.service";
import { createCompanySchema } from "../../../src/modules/company/company.schema";

const service = new CompanyService();

export async function GET() {
  const companies = await service.list();

  return NextResponse.json(companies);
}

export async function POST(req: Request) {
  const body = await req.json();

  const result = createCompanySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten() },
      { status: 400 }
    );
  }

  const company = await service.create(result.data);

  return NextResponse.json(company, { status: 201 });
}