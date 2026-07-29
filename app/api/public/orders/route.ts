import { NextResponse } from "next/server";
import { createOrder } from "@/modules/wave1/orders";

export async function POST(req: Request) {
  const result = await createOrder(await req.json());
  return NextResponse.json(result.body, { status: result.status });
}
