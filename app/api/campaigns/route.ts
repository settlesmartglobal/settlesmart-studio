import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { approveCampaign } from "@/modules/studio/service";
import { campaignSchema } from "@/modules/wave1/schemas";
import { z } from "zod";

const campaignActionSchema = z.object({
  campaignId: z.string().uuid(),
  action: z.enum(["APPROVE"]),
});

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId") ?? undefined;
  return NextResponse.json(await prisma.studioCampaign.findMany({ where: { companyId }, include: { company: true, product: true }, orderBy: { createdAt: "desc" } }));
}

export async function POST(req: Request) {
  const result = campaignSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  const data = result.data;
  const campaign = await prisma.studioCampaign.create({
    data: {
      companyId: data.companyId,
      productId: data.productId || undefined,
      name: data.name,
      campaignType: data.campaignType,
      objective: data.objective || undefined,
      inputText: data.inputText || undefined,
      selectedPlatformsJson: data.selectedPlatformsJson,
      sourceType: data.productId ? "PRODUCT" : "MANUAL",
      sourceReferenceId: data.productId || undefined,
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}

export async function PATCH(req: Request) {
  const result = campaignActionSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  try {
    if (result.data.action === "APPROVE") return NextResponse.json(await approveCampaign(result.data.campaignId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign update failed" }, { status: 400 });
  }
}
