import { NextResponse } from "next/server";
import { extractionSchema, approvalSchema } from "@/modules/studio/schemas";
import { approveCampaignInput, extractAndStoreCampaign } from "@/modules/studio/service";

export async function POST(req: Request) {
  const result = extractionSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await extractAndStoreCampaign({ ...result.data, sourceReferenceId: result.data.sourceReferenceId || undefined }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Extraction failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const result = approvalSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await approveCampaignInput(result.data.campaignId, result.data.structuredDetailsJson, result.data.approved));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 400 });
  }
}
