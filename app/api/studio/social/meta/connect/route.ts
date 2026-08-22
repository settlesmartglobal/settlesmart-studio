import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { metaOAuthUrl } from "@/modules/studio/providers/social/meta";

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(metaOAuthUrl(companyId, state));
  response.cookies.set("studio_meta_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600 });
  return response;
}
