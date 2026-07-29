import { NextResponse } from "next/server";
import { posterSchema } from "@/modules/studio/schemas";
import { generatePoster } from "@/modules/studio/service";

export async function POST(req: Request) {
  const result = posterSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await generatePoster(result.data.campaignId, result.data.platform, result.data.headline, result.data.supportingText), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Poster generation failed" }, { status: 400 });
  }
}
