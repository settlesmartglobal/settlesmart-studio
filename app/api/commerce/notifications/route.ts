import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { notifyOrderEvent, whatsappProvider } from "@/modules/wave1/notifications";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Admin authorization is required." }, { status: 403 });
  const body = await req.json();
  const company = await prisma.company.findFirst({ where: { commerceEnabled: true, slug: "dubai-delights" }, include: { commerceSettings: true } });
  if (!company) return NextResponse.json({ error: "Commerce company not found" }, { status: 404 });
  const event = await prisma.$transaction((tx) => notifyOrderEvent({
    tx,
    companyId: company.id,
    eventType: body.eventType ?? "ORDER_CREATED",
    recipient: body.mobile,
    message: `Test WhatsApp notification from ${company.commerceSettings?.displayName ?? company.name}.`,
    consentGranted: true,
    metadata: { templateVariables: { customerName: "Test Customer", orderNumber: "TEST", restaurantName: company.commerceSettings?.displayName ?? company.name, amount: "0.00", paymentMethod: "TEST", receiptUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/commerce` } },
  }));
  return NextResponse.json({ provider: whatsappProvider(), event });
}
