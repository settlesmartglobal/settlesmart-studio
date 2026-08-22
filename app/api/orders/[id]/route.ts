import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { orderStatusSchema } from "@/modules/wave1/schemas";
import { transitionOrder } from "@/modules/wave1/order-transitions";

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
  const transition = await transitionOrder(prisma, { orderId: id, ...result.data });
  return NextResponse.json(transition.body, { status: transition.status });
}
