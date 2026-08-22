import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { importCatalogue, parseCatalogueWorkbook } from "@/modules/wave1/catalogue-import";

export async function POST(req: Request) {
  const form = await req.formData();
  const companyId = String(form.get("companyId") ?? "");
  const mode = String(form.get("mode") ?? "CREATE_NEW") === "CREATE_OR_UPDATE" ? "CREATE_OR_UPDATE" : "CREATE_NEW";
  const confirm = form.get("confirm") === "true";
  const file = form.get("file");
  if (!companyId || !(file instanceof File)) return NextResponse.json({ error: "Company and workbook are required." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Workbook must be 5 MB or smaller." }, { status: 400 });
  if (!file.name.endsWith(".xlsx")) return NextResponse.json({ error: "Upload the XLSX template." }, { status: 400 });
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!confirm) return NextResponse.json({ preview: parseCatalogueWorkbook(buffer) });
  try {
    const result = await importCatalogue(prisma, companyId, buffer, mode);
    if (!result.ok) return NextResponse.json({ preview: result.preview, error: "Fix validation errors before importing." }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 400 });
  }
}
