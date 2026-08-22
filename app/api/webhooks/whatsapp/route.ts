import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { updateNotificationStatus, verifyWhatsappSignature } from "@/modules/wave1/notifications";

const metaStatusMap: Record<string, "SUBMITTED" | "DELIVERED" | "READ" | "FAILED"> = {
  submitted: "SUBMITTED",
  sent: "SUBMITTED",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!verifyWhatsappSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }
  const payload = JSON.parse(rawBody || "{}") as {
    entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id?: string; status?: string; errors?: Array<{ code?: string; title?: string; message?: string }> }>; messages?: Array<{ id?: string; from?: string; text?: { body?: string } }> } }> }>;
  };
  await prisma.$transaction(async (tx) => {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          if (!status.id || !status.status) continue;
          const nextStatus = metaStatusMap[status.status];
          if (!nextStatus) continue;
          const error = status.errors?.[0];
          await updateNotificationStatus(tx, status.id, nextStatus, error ? { code: String(error.code ?? "META_FAILED"), message: String(error.title ?? error.message ?? "WhatsApp delivery failed.") } : undefined);
        }
        for (const message of change.value?.messages ?? []) {
          await tx.whatsAppInboundMessage.upsert({
            where: { providerMessageId: message.id ?? `missing-${Date.now()}` },
            update: {},
            create: {
              providerMessageId: message.id,
              fromNumber: message.from ? `***${message.from.slice(-4)}` : undefined,
              bodyPreview: message.text?.body?.slice(0, 160),
              payloadJson: message as never,
            },
          });
        }
      }
    }
  });
  return NextResponse.json({ ok: true });
}
