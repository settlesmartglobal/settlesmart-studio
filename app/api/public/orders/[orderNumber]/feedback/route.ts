import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { z } from "zod";

const feedbackSchema = z.object({
  token: z.string().min(8),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().or(z.literal("")),
});

export async function POST(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const contentType = req.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const result = feedbackSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const order = await prisma.order.findFirst({ where: { orderNumber, trackingToken: result.data.token } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!["DELIVERED", "COMPLETED"].includes(order.status)) return NextResponse.json({ error: "Feedback is available after delivery." }, { status: 400 });
  const feedback = await prisma.customerFeedback.upsert({
    where: { orderId: order.id },
    update: { rating: result.data.rating, comment: result.data.comment || undefined, submittedAt: new Date() },
    create: { orderId: order.id, rating: result.data.rating, comment: result.data.comment || undefined },
  });
  return NextResponse.json(feedback);
}
