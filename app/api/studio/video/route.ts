import { NextResponse } from "next/server";
import { createStudioVideoJob } from "@/modules/studio/video";
import { z } from "zod";

const videoSchema = z.object({
  campaignId: z.string().uuid(),
  reelType: z.enum(["QUICK_REEL", "RECRUITMENT_REEL", "PROMOTIONAL_VIDEO"]).default("QUICK_REEL"),
  style: z.enum(["Professional", "Lifestyle", "Cinematic", "Product Focus", "Recruitment", "Food/Hospitality"]).default("Professional"),
  format: z.enum(["portrait", "square", "landscape"]).default("portrait"),
  quality: z.enum(["standard", "premium"]).default("standard"),
});

export async function POST(req: Request) {
  const result = videoSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await createStudioVideoJob(result.data), { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Video generation failed" }, { status: 400 });
  }
}
