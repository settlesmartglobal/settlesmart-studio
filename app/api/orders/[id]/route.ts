import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { orderStatusSchema } from "@/modules/wave1/schemas";
import { statusTimestamp } from "@/modules/wave1/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, customer: true, statusHistory: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = orderStatusSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: { status: result.data.status, ...statusTimestamp(result.data.status) },
      include: { items: true, statusHistory: true },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: id, previousStatus: existing.status, newStatus: result.data.status, note: result.data.note || undefined },
    });
    return updated;
  });
  return NextResponse.json(order);
}
