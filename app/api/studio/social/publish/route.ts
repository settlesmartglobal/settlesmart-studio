import { NextResponse } from "next/server";
import { getMetaPublishingReadiness, publishToMeta } from "@/modules/studio/providers/social/meta";
import { z } from "zod";

const publishSchema = z.object({
  companyId: z.string().uuid(),
  campaignId: z.string().uuid().optional().or(z.literal("")),
  mediaAssetId: z.string().uuid(),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1),
  caption: z.string().min(1).max(2200),
  hashtags: z.string().max(500).optional().or(z.literal("")),
  scheduledAt: z.string().optional().or(z.literal("")),
});

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? "";
  const result = z.string().uuid().safeParse(companyId);
  if (!result.success) return NextResponse.json({ error: "Company is required." }, { status: 400 });
  return NextResponse.json(await getMetaPublishingReadiness(result.data));
}

export async function POST(req: Request) {
  const result = publishSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const readiness = await getMetaPublishingReadiness(result.data.companyId);
  if (!readiness.ready) {
    return NextResponse.json({
      error: "Social publishing is not connected yet.",
      supportingText: "You can download the approved media and publish manually, or connect Meta later from Settings.",
      readiness,
    }, { status: 409 });
  }
  try {
    return NextResponse.json(await publishToMeta({ ...result.data, campaignId: result.data.campaignId || undefined, scheduledAt: result.data.scheduledAt || undefined }), { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publishing failed" }, { status: 400 });
  }
}
