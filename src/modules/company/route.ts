import { NextResponse } from "next/server";
import { CompanyService } from "@/modules/company/company.service";

const service = new CompanyService();

export async function GET() {
  const companies = await service.list();

  return NextResponse.json(companies);
}

export async function POST(request: Request) {
  const body = await request.json();

  const company = await service.create(body);

  return NextResponse.json(company);
}