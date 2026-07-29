import { NextResponse } from "next/server";
import { exportSchema } from "@/modules/studio/schemas";
import { exportPlatforms } from "@/modules/studio/service";

export async function POST(req: Request) {
  const result = exportSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await exportPlatforms(result.data.campaignId, result.data.platforms), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 400 });
  }
}
