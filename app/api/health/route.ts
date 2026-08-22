import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { whatsappProvider } from "@/modules/wave1/notifications";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const provider = whatsappProvider();
    const whatsappReady = provider === "meta" ? Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) : true;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      storage: { provider: process.env.STORAGE_PROVIDER ?? "local", ready: Boolean(process.env.UPLOAD_DIR ?? "public/uploads") },
      whatsapp: { provider, ready: whatsappReady },
    });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
