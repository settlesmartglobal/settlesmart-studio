import { NextResponse } from "next/server";
import { completeMetaOAuth } from "@/modules/studio/providers/social/meta";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const [companyId, state] = (url.searchParams.get("state") ?? ":").split(":");
  const cookieState = req.headers.get("cookie")?.match(/studio_meta_oauth_state=([^;]+)/)?.[1];
  if (!code || !companyId || !state || cookieState !== state) return NextResponse.json({ error: "Invalid Meta OAuth callback" }, { status: 400 });
  await completeMetaOAuth(companyId, code);
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/studio?section=settings&company=${companyId}`);
}
