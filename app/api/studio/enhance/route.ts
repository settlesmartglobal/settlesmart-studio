import { NextResponse } from "next/server";
import { enhancementSchema } from "@/modules/studio/schemas";
import { requestEnhancement } from "@/modules/studio/service";

export async function POST(req: Request) {
  const result = enhancementSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await requestEnhancement({ ...result.data, campaignId: result.data.campaignId || undefined }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enhancement request failed" }, { status: 400 });
  }
}
