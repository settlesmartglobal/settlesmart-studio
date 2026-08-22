import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/core/database/prisma";
import { catalogueColumns } from "@/modules/wave1/catalogue-import";

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? "";
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  const products = await prisma.product.findMany({ where: { companyId }, include: { category: true, variants: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  const rows = products.flatMap((product) => {
    const base = {
      SKU: product.sku ?? "",
      "Product Name": product.name,
      Category: product.category?.name ?? "",
      "Short Description": product.shortDescription ?? "",
      Description: product.description ?? "",
      "Base Price": Number(product.regularPrice),
      "Promotional Price": product.promotionalPrice == null ? "" : Number(product.promotionalPrice),
      "Inventory Mode": product.inventoryMode,
      "Opening Stock": product.inventoryQuantity ?? "",
      "Low Stock Threshold": product.lowStockThreshold ?? "",
      Active: product.available ? "TRUE" : "FALSE",
      Vegetarian: product.vegetarian ? "TRUE" : "FALSE",
      Spicy: product.spicy ? "TRUE" : "FALSE",
      Bestseller: product.bestseller ? "TRUE" : "FALSE",
      "Preparation Minutes": product.preparationMinutes ?? "",
      Taxable: product.taxable ? "TRUE" : "FALSE",
      "Display Order": product.displayOrder,
    };
    if (!product.variants.length) return [{ ...base, "Variant Name": "", "Variant Description": "", "Variant Price": "" }];
    return product.variants.map((variant) => ({ ...base, "Variant Name": variant.name, "Variant Description": variant.description ?? "", "Variant Price": variant.price == null ? "" : Number(variant.price), Active: variant.active ? "TRUE" : "FALSE" }));
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: catalogueColumns }), "Products");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": 'attachment; filename="SettleSmart_Commerce_Catalogue_Export.xlsx"' } });
}
