import { NextResponse } from "next/server";
import { generationSchema } from "@/modules/studio/schemas";
import { generateContent } from "@/modules/studio/service";

export async function POST(req: Request) {
  const result = generationSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await generateContent(result.data.campaignId, result.data.platforms), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 400 });
  }
}
