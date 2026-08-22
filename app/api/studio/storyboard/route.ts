import { NextResponse } from "next/server";
import { storyboardSchema } from "@/modules/studio/schemas";
import { generateStoryboard } from "@/modules/studio/service";

export async function POST(req: Request) {
  const result = storyboardSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await generateStoryboard(result.data.campaignId, result.data.targetDuration, result.data.mediaAssetId || undefined), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Storyboard generation failed" }, { status: 400 });
  }
}
