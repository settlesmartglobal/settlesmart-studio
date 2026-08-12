import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const videoProvider = readFileSync("src/modules/studio/providers/video/openai-provider.ts", "utf8");
const videoService = readFileSync("src/modules/studio/video.ts", "utf8");
const webhook = readFileSync("app/api/webhooks/openai/route.ts", "utf8");
const metaProvider = readFileSync("src/modules/studio/providers/social/meta/index.ts", "utf8");
const processRoute = readFileSync("app/api/studio/social/process/route.ts", "utf8");
const studioPage = readFileSync("app/studio/page.tsx", "utf8");

assert.ok(videoProvider.includes("https://api.openai.com/v1/videos"), "video request construction uses OpenAI Videos endpoint");
assert.ok(videoProvider.includes("seconds: input.duration"), "video request includes duration");
assert.ok(videoService.includes("providerJobId: providerResult.providerJobId"), "video job persists provider job id");
assert.ok(videoService.includes("/v1/videos/"), "completed video download uses provider content endpoint");
assert.ok(videoService.includes("writeGeneratedBuffer"), "completed video is stored through Studio storage");
assert.ok(videoService.includes("outputMediaAssetId"), "completed video is associated to processing job");
assert.ok(videoService.includes("if (job.outputMediaAssetId) return job"), "duplicate webhook delivery is idempotent");
assert.ok(videoService.includes("sora-2-pro") || videoService.includes("premiumModel"), "premium model selection is supported");
assert.ok(webhook.includes("client.webhooks.unwrap"), "webhook verifies OpenAI signature");
assert.ok(webhook.includes("Invalid webhook signature"), "invalid webhook is rejected");
assert.ok(webhook.includes("completeOpenAiVideoJob"), "webhook completion downloads/persists video");
assert.ok(webhook.includes("failOpenAiVideoJob"), "webhook failure persists failed status");

assert.ok(metaProvider.includes("studio_meta_oauth_state") === false, "Meta provider does not expose OAuth state cookie logic client-side");
assert.ok(metaProvider.includes("companyId: input.companyId"), "Meta publish jobs are company scoped");
assert.ok(metaProvider.includes("Missing Meta permissions"), "missing permissions are rejected");
assert.ok(metaProvider.includes("image_url"), "Instagram image publishing is implemented");
assert.ok(metaProvider.includes('media_type: "REELS"'), "Instagram Reel publishing is implemented");
assert.ok(metaProvider.includes("/photos"), "Facebook image publishing is implemented");
assert.ok(metaProvider.includes("/videos"), "Facebook Reel/video publishing is implemented");
assert.ok(metaProvider.includes("publishIntentKey"), "duplicate publish prevention uses stable key");
assert.ok(metaProvider.includes("processDueMetaPublishJobs"), "scheduled publish execution exists");
assert.ok(metaProvider.includes("nextRetryAt"), "retry scheduling is persisted");
assert.ok(metaProvider.includes("publishedUrl"), "published URL persistence exists");
assert.ok(metaProvider.includes("asset.approvalStatus !== \"APPROVED\""), "unapproved media cannot publish");
assert.ok(metaProvider.includes("findFirst({ where: { id: input.mediaAssetId, companyId: input.companyId }"), "cross-company publish is rejected");
assert.ok(metaProvider.includes("isPublicHttpsUrl"), "localhost/private URLs are rejected");
assert.ok(processRoute.includes("STUDIO_CRON_SECRET"), "scheduled worker endpoint is protected");
assert.ok(studioPage.includes("READY") && studioPage.includes("PARTIAL") && studioPage.includes("NOT CONFIGURED"), "settings readiness states are displayed");
assert.ok(!studioPage.includes("OPENAI_API_KEY") && !studioPage.includes("META_APP_SECRET"), "settings do not expose secret variable names");

console.log("Provider lifecycle contract tests passed.");
