import OpenAI from "openai";
import { NextResponse } from "next/server";
import { completeOpenAiVideoJob, failOpenAiVideoJob } from "@/modules/studio/video";

export async function POST(req: Request) {
  if (!process.env.OPENAI_WEBHOOK_SECRET) return NextResponse.json({ error: "OpenAI webhook secret not configured" }, { status: 503 });
  const body = await req.text();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, webhookSecret: process.env.OPENAI_WEBHOOK_SECRET });
  let event: { type?: string; data?: { id?: string; status?: string; error?: { message?: string } } };
  try {
    event = await client.webhooks.unwrap(body, Object.fromEntries(req.headers.entries())) as never;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
  const videoId = event.data?.id;
  if (!videoId) return NextResponse.json({ ok: true });
  const failed = event.type?.includes("failed") || event.data?.status === "failed";
  const completed = event.type?.includes("completed") || event.data?.status === "completed";
  if (failed) await failOpenAiVideoJob(videoId, event.data?.error?.message);
  else if (completed) await completeOpenAiVideoJob(videoId);
  return NextResponse.json({ ok: true });
}
