import { prisma } from "@/core/database/prisma";
import { decryptSecret, encryptSecret } from "@/modules/studio/crypto";
import { isPublicHttpsUrl, publicAssetUrl } from "@/modules/studio/storage";
import { metaConfig } from "../../config";
import type { MetaConnection, PublishInput } from "./types";

const scopes = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish"];
const maxAttempts = 3;

function publishKey(input: PublishInput, platform: "INSTAGRAM" | "FACEBOOK") {
  return [input.companyId, input.campaignId ?? "none", input.mediaAssetId, platform, "organic", input.scheduledAt ?? "now"].join(":");
}

function isTransient(status: number, code?: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500 || code === 1 || code === 2 || code === 4 || code === 17 || code === 32;
}

function safeMessage(json: { error?: { message?: string } }, fallback: string) {
  return json.error?.message?.slice(0, 500) ?? fallback;
}

function nextRetry(attempts: number) {
  return new Date(Date.now() + Math.min(60, 5 * 2 ** Math.max(0, attempts - 1)) * 60 * 1000);
}

export function metaOAuthUrl(companyId: string, state: string) {
  const config = metaConfig();
  if (!config.configured) throw new Error("Meta OAuth is not configured.");
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state: `${companyId}:${state}`,
    scope: scopes.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${config.graphApiVersion}/dialog/oauth?${params.toString()}`;
}

export async function getMetaConnection(companyId: string): Promise<MetaConnection> {
  const settings = await prisma.studioSettings.findUnique({ where: { companyId } });
  const json = (settings?.integrationSettingsJson ?? {}) as { meta?: MetaConnection };
  return json.meta ?? { provider: "meta", status: metaConfig().configured ? "NOT_CONNECTED" : "CONFIGURATION_REQUIRED" };
}

export async function saveMetaConnection(companyId: string, connection: MetaConnection) {
  const settings = await prisma.studioSettings.findUnique({ where: { companyId } });
  const existing = (settings?.integrationSettingsJson ?? {}) as Record<string, unknown>;
  return prisma.studioSettings.upsert({
    where: { companyId },
    update: { integrationSettingsJson: { ...existing, meta: connection } },
    create: { companyId, integrationSettingsJson: { meta: connection } },
  });
}

export async function completeMetaOAuth(companyId: string, code: string) {
  const config = metaConfig();
  if (!config.configured) throw new Error("Meta OAuth is not configured.");
  const tokenRes = await fetch(`https://graph.facebook.com/${config.graphApiVersion}/oauth/access_token?${new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code })}`);
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) throw new Error("Meta token exchange failed.");
  const pagesRes = await fetch(`https://graph.facebook.com/${config.graphApiVersion}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(tokenJson.access_token)}`);
  const pagesJson = await pagesRes.json();
  if (!pagesRes.ok) throw new Error("Meta Page discovery failed.");
  const page = pagesJson.data?.[0];
  const pageToken = page?.access_token ?? tokenJson.access_token;
  const connection: MetaConnection = {
    provider: "meta",
    status: "CONNECTED",
    facebookPageId: page?.id,
    facebookPageName: page?.name,
    instagramAccountId: page?.instagram_business_account?.id,
    instagramUsername: page?.instagram_business_account?.username,
    encryptedAccessToken: encryptSecret(String(pageToken)),
    expiresAt: tokenJson.expires_in ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString() : null,
    grantedScopes: scopes,
    lastVerifiedAt: new Date().toISOString(),
  };
  await saveMetaConnection(companyId, connection);
  return connection;
}

export async function publishToMeta(input: PublishInput) {
  const asset = await prisma.mediaAsset.findFirst({ where: { id: input.mediaAssetId, companyId: input.companyId } });
  if (!asset) throw new Error("Media asset not found for company.");
  const scheduled = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const jobs = [];
  for (const platform of input.platforms) {
    const key = publishKey(input, platform);
    const existing = await prisma.mediaProcessingJob.findUnique({ where: { publishIntentKey: key } });
    if (existing) {
      jobs.push(existing);
      continue;
    }
    const job = await prisma.mediaProcessingJob.create({ data: { companyId: input.companyId, campaignId: input.campaignId, inputMediaAssetId: input.mediaAssetId, jobType: "PLATFORM_EXPORT", status: scheduled && !input.forceNow ? "SCHEDULED" : "SUBMITTING", publishIntentKey: key, configurationJson: { provider: "meta", platform, caption: input.caption, hashtags: input.hashtags, scheduledAt: scheduled?.toISOString(), mediaKind: asset.mimeType.startsWith("video/") ? "video" : "image" } } });
    jobs.push(scheduled && !input.forceNow ? job : await submitMetaPublishJob(job.id));
  }
  return jobs;
}

export async function submitMetaPublishJob(jobId: string) {
  const job = await prisma.mediaProcessingJob.findUnique({ where: { id: jobId }, include: { inputMediaAsset: true } });
  if (!job?.inputMediaAsset) throw new Error("Publish job not found.");
  if (job.status === "PUBLISHED" || job.status === "COMPLETED") return job;
  const asset = job.inputMediaAsset;
  const configJson = (job.configurationJson ?? {}) as { platform?: "INSTAGRAM" | "FACEBOOK"; caption?: string; hashtags?: string };
  const platform = configJson.platform;
  if (!platform) throw new Error("Publish platform missing.");
  const attempts = job.attempts + 1;
  const fail = async (failureCode: string, message: string, retryable = false) => prisma.mediaProcessingJob.update({ where: { id: job.id }, data: { status: retryable && attempts < maxAttempts ? "SCHEDULED" : "FAILED", attempts, lastAttemptAt: new Date(), nextRetryAt: retryable && attempts < maxAttempts ? nextRetry(attempts) : null, failureCode, errorMessage: message } });
  if (asset.approvalStatus !== "APPROVED") return fail("MEDIA_NOT_APPROVED", "Approve media before publishing.");
  const url = publicAssetUrl(asset.filePath);
  if (!isPublicHttpsUrl(url)) return fail("PUBLIC_URL_REQUIRED", "Deploy/configure public storage before publishing.");
  const connection = await getMetaConnection(job.companyId);
  if (connection.status !== "CONNECTED" || !connection.encryptedAccessToken) return fail("META_NOT_CONNECTED", "Connect Meta account in Settings before publishing.");
  const missingScopes = scopes.filter((scope) => !connection.grantedScopes?.includes(scope));
  if (missingScopes.length) return fail("META_PERMISSION_MISSING", `Missing Meta permissions: ${missingScopes.join(", ")}`);
  const token = decryptSecret(connection.encryptedAccessToken);
  const providerConfig = metaConfig();
  await prisma.mediaProcessingJob.update({ where: { id: job.id }, data: { status: "PROCESSING", attempts, lastAttemptAt: new Date(), errorMessage: null, failureCode: null } });
  const result = asset.mimeType.startsWith("video/")
    ? platform === "INSTAGRAM"
      ? await publishInstagramReel(connection.instagramAccountId, token, providerConfig.graphApiVersion, url, configJson.caption ?? "", configJson.hashtags ?? "")
      : await publishFacebookReel(connection.facebookPageId, token, providerConfig.graphApiVersion, url, configJson.caption ?? "", configJson.hashtags ?? "")
    : platform === "INSTAGRAM"
      ? await publishInstagramImage(connection.instagramAccountId, token, providerConfig.graphApiVersion, url, configJson.caption ?? "", configJson.hashtags ?? "")
      : await publishFacebookImage(connection.facebookPageId, token, providerConfig.graphApiVersion, url, configJson.caption ?? "", configJson.hashtags ?? "");
  if (!result.ok) return fail(result.code, result.message, result.retryable);
  return prisma.mediaProcessingJob.update({ where: { id: job.id }, data: { status: "PUBLISHED", progress: 100, completedAt: new Date(), publishedAt: new Date(), providerPostId: result.postId, publishedUrl: result.permalink, errorMessage: null, failureCode: null, configurationJson: { ...configJson, provider: "meta", platform, publicUrl: url, containerId: result.containerId, providerPostId: result.postId, permalink: result.permalink } } });
}

export async function processDueMetaPublishJobs(limit = 10) {
  const jobs = await prisma.mediaProcessingJob.findMany({ where: { jobType: "PLATFORM_EXPORT", status: "SCHEDULED", OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] }, orderBy: { createdAt: "asc" }, take: limit });
  const results = [];
  for (const job of jobs) {
    const claimed = await prisma.mediaProcessingJob.updateMany({ where: { id: job.id, status: "SCHEDULED" }, data: { status: "SUBMITTING" } });
    if (claimed.count === 1) results.push(await submitMetaPublishJob(job.id));
  }
  return results;
}

type MetaResult = { ok: true; postId: string; permalink?: string; containerId?: string } | { ok: false; code: string; message: string; retryable: boolean };

async function graphJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function publishInstagramImage(accountId: string | undefined, token: string, version: string, url: string, caption: string, hashtags: string): Promise<MetaResult> {
  if (!accountId) return { ok: false, code: "INSTAGRAM_NOT_CONNECTED", message: "Instagram professional account is not connected.", retryable: false };
  const create = await graphJson(`https://graph.facebook.com/${version}/${accountId}/media`, { method: "POST", body: new URLSearchParams({ image_url: url, caption: `${caption}\n${hashtags}`.trim(), access_token: token }) });
  if (!create.response.ok) return { ok: false, code: "INSTAGRAM_CONTAINER_FAILED", message: safeMessage(create.json, "Instagram media container failed."), retryable: isTransient(create.response.status, create.json.error?.code) };
  return publishInstagramContainer(accountId, token, version, String(create.json.id));
}

async function publishInstagramReel(accountId: string | undefined, token: string, version: string, url: string, caption: string, hashtags: string): Promise<MetaResult> {
  if (!accountId) return { ok: false, code: "INSTAGRAM_NOT_CONNECTED", message: "Instagram professional account is not connected.", retryable: false };
  const create = await graphJson(`https://graph.facebook.com/${version}/${accountId}/media`, { method: "POST", body: new URLSearchParams({ media_type: "REELS", video_url: url, caption: `${caption}\n${hashtags}`.trim(), access_token: token }) });
  if (!create.response.ok) return { ok: false, code: "INSTAGRAM_REEL_CONTAINER_FAILED", message: safeMessage(create.json, "Instagram Reel container failed."), retryable: isTransient(create.response.status, create.json.error?.code) };
  const ready = await waitForInstagramContainer(String(create.json.id), token, version);
  if (!ready.ok) return ready;
  return publishInstagramContainer(accountId, token, version, String(create.json.id));
}

async function waitForInstagramContainer(containerId: string, token: string, version: string): Promise<{ ok: true } | { ok: false; code: string; message: string; retryable: boolean }> {
  for (let i = 0; i < 4; i += 1) {
    const status = await graphJson(`https://graph.facebook.com/${version}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (!status.response.ok) return { ok: false, code: "INSTAGRAM_CONTAINER_STATUS_FAILED", message: safeMessage(status.json, "Instagram container status failed."), retryable: isTransient(status.response.status, status.json.error?.code) };
    if (status.json.status_code === "FINISHED") return { ok: true };
    if (status.json.status_code === "ERROR" || status.json.status_code === "EXPIRED") return { ok: false, code: "INSTAGRAM_CONTAINER_NOT_READY", message: "Instagram Reel processing failed or expired.", retryable: false };
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { ok: false, code: "INSTAGRAM_CONTAINER_PROCESSING", message: "Instagram Reel is still processing.", retryable: true };
}

async function publishInstagramContainer(accountId: string, token: string, version: string, containerId: string): Promise<MetaResult> {
  const publish = await graphJson(`https://graph.facebook.com/${version}/${accountId}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: containerId, access_token: token }) });
  if (!publish.response.ok) return { ok: false, code: "INSTAGRAM_PUBLISH_FAILED", message: safeMessage(publish.json, "Instagram publish failed."), retryable: isTransient(publish.response.status, publish.json.error?.code) };
  const permalink = await fetchPermalink(version, String(publish.json.id), token);
  return { ok: true, containerId, postId: String(publish.json.id), permalink };
}

async function publishFacebookImage(pageId: string | undefined, token: string, version: string, url: string, caption: string, hashtags: string): Promise<MetaResult> {
  if (!pageId) return { ok: false, code: "FACEBOOK_PAGE_NOT_CONNECTED", message: "Facebook Page is not connected.", retryable: false };
  const create = await graphJson(`https://graph.facebook.com/${version}/${pageId}/photos`, { method: "POST", body: new URLSearchParams({ url, caption: `${caption}\n${hashtags}`.trim(), access_token: token }) });
  if (!create.response.ok) return { ok: false, code: "FACEBOOK_IMAGE_FAILED", message: safeMessage(create.json, "Facebook image publish failed."), retryable: isTransient(create.response.status, create.json.error?.code) };
  const permalink = await fetchPermalink(version, String(create.json.post_id ?? create.json.id), token);
  return { ok: true, postId: String(create.json.post_id ?? create.json.id), permalink };
}

async function publishFacebookReel(pageId: string | undefined, token: string, version: string, url: string, caption: string, hashtags: string): Promise<MetaResult> {
  if (!pageId) return { ok: false, code: "FACEBOOK_PAGE_NOT_CONNECTED", message: "Facebook Page is not connected.", retryable: false };
  const create = await graphJson(`https://graph.facebook.com/${version}/${pageId}/videos`, { method: "POST", body: new URLSearchParams({ file_url: url, description: `${caption}\n${hashtags}`.trim(), access_token: token }) });
  if (!create.response.ok) return { ok: false, code: "FACEBOOK_REEL_FAILED", message: safeMessage(create.json, "Facebook Reel publish failed."), retryable: isTransient(create.response.status, create.json.error?.code) };
  const permalink = await fetchPermalink(version, String(create.json.id), token);
  return { ok: true, postId: String(create.json.id), permalink };
}

async function fetchPermalink(version: string, id: string, token: string) {
  const result = await graphJson(`https://graph.facebook.com/${version}/${id}?fields=permalink_url,permalink&access_token=${encodeURIComponent(token)}`);
  return result.response.ok ? String(result.json.permalink_url ?? result.json.permalink ?? "") || undefined : undefined;
}
