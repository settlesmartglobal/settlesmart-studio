import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { createOrder } from "@/modules/wave1/orders";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const companyId = params.get("companyId") ?? undefined;
  const status = params.get("status") ?? undefined;
  const orders = await prisma.order.findMany({
    where: { companyId, status: status as never },
    include: { items: true, customer: true },
    orderBy: { placedAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const result = await createOrder(await req.json());
  return NextResponse.json(result.body, { status: result.status });
}
