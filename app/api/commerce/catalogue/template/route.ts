import { NextResponse } from "next/server";
import { catalogueTemplateBuffer } from "@/modules/wave1/catalogue-import";

export async function GET() {
  return new NextResponse(new Uint8Array(catalogueTemplateBuffer()), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="SettleSmart_Commerce_Product_Import.xlsx"',
    },
  });
}
