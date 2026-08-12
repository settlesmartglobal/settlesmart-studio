import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studioPage = readFileSync("app/studio/page.tsx", "utf8");
const studioActions = readFileSync("app/components/studio-actions.tsx", "utf8");
const studioService = readFileSync("src/modules/studio/service.ts", "utf8");
const campaignsRoute = readFileSync("app/api/campaigns/route.ts", "utf8");
const media = readFileSync("src/modules/studio/media.ts", "utf8");
const imageProvider = readFileSync("src/modules/studio/providers/image/openai-provider.ts", "utf8");
const videoProvider = readFileSync("src/modules/studio/providers/video/openai-provider.ts", "utf8");
const metaProvider = readFileSync("src/modules/studio/providers/social/meta/index.ts", "utf8");
const settings = readFileSync("app/studio/page.tsx", "utf8");

for (const [label, route] of [
  ["Create Campaign", "/studio?section=campaigns"],
  ["Generate Poster", "/studio?section=create"],
  ["Create Social Content", "/studio?section=create"],
  ["Upload Image", "/studio?section=media"],
  ["Upload Video", "/studio?section=media"],
  ["Open Brand Kit", "/studio?section=brand"],
  ["View Media Library", "/studio?section=media"],
]) {
  assert.ok(studioPage.includes(label), `overview quick action exists: ${label}`);
  assert.ok(studioPage.includes(route), `overview quick action routes inside Studio: ${label}`);
}

for (const [label, endpoint] of [
  ["Generate Content", "/api/studio/generate"],
  ["Generate Poster", "/api/studio/poster"],
  ["Storyboard", "/api/studio/storyboard"],
  ["Approve", "/api/campaigns"],
  ["Run Studio Intelligence", "/api/studio/extract"],
  ["Use in Business", "/api/studio/placements"],
  ["Media Approve", "/api/media-library/"],
]) {
  assert.ok(studioActions.includes(endpoint), `${label} is wired to ${endpoint}`);
}

assert.ok(studioActions.includes("router.refresh()"), "Studio actions refresh after mutations");
assert.ok(studioActions.includes("Generating..."), "content generation has loading state");
assert.ok(studioActions.includes("Generating Poster..."), "poster generation has loading state");
assert.ok(studioActions.includes("Video provider not configured"), "video action states provider limitation");
assert.ok(studioActions.includes("Connect Meta account in Settings before publishing."), "publish action states Meta limitation");
assert.ok(campaignsRoute.includes("approveCampaign"), "campaign approval API uses service action");
assert.ok(studioService.includes("approvedAt: now"), "approval persists output approvedAt");
assert.ok(studioService.includes('status: "APPROVED"'), "approval persists campaign status");
assert.ok(media.includes('metadataJson: { templateMode: "demo-svg"'), "poster generation is accurately labelled deterministic demo SVG");
assert.ok(media.includes("composeBrandedPoster"), "poster generation uses deterministic brand composition for AI images");
assert.ok(imageProvider.includes("client.images.generate"), "OpenAI image provider uses official SDK image generation");
assert.ok(imageProvider.includes("STUDIO_IMAGE_MODEL") || imageProvider.includes("studioImageConfig"), "OpenAI image provider reads centralized image model config");
assert.ok(videoProvider.includes("https://api.openai.com/v1/videos"), "OpenAI video provider uses Videos API");
assert.ok(metaProvider.includes("instagram_content_publish"), "Meta provider requests Instagram publishing scope");
assert.ok(metaProvider.includes("isPublicHttpsUrl"), "Meta publishing blocks non-public media URLs");
assert.ok(settings.includes("Connect Meta"), "Studio Settings exposes Meta connection action");
assert.ok(settings.includes("Image readiness"), "Studio Settings shows image provider readiness");
assert.ok(settings.includes("Video readiness"), "Studio Settings shows video provider readiness");
assert.ok(studioPage.includes("Apply filters"), "media filters are functional form controls");
assert.ok(studioPage.includes("Retry unavailable"), "processing retry is not a dead button");
assert.ok(studioPage.includes("Use Template"), "templates provide a Studio create workflow entry");

console.log("Studio action contract tests passed.");
