import { NextResponse } from "next/server";
import { processDueMetaPublishJobs } from "@/modules/studio/providers/social/meta";

export async function POST(req: Request) {
  const expected = process.env.STUDIO_CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "Cron secret not configured" }, { status: 503 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 10);
  const jobs = await processDueMetaPublishJobs(Math.min(Math.max(limit, 1), 50));
  return NextResponse.json({ processed: jobs.length, jobs });
}
