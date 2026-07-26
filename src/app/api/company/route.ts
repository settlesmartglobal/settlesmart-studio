import { NextResponse } from "next/server";
import { CompanyService } from "@/modules/company/service";

const service = new CompanyService();

export async function GET() {
  const companies = await service.list();

  return NextResponse.json({
    success: true,
    data: companies,
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const company = await service.create(
    body.name,
    body.slug
  );

  return NextResponse.json({
    success: true,
    data: company,
  });
}