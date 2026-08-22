"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizePublicAssetPath } from "@/modules/wave1/assets";
import { AssetImage } from "./asset-image";

type Company = { id: string; name: string; brandProfile?: { approvalStatus: string } | null };
type Campaign = {
  id: string;
  name: string;
  status?: string;
  objective?: string | null;
  campaignType?: string;
  selectedPlatforms?: string[];
  product?: { regularPrice: number; promotionalPrice: number | null; createdAt: string; updatedAt: string } | null;
  outputs?: CampaignOutput[];
  mediaAssets?: MediaAsset[];
  storyboards?: Storyboard[];
};
type Media = { id: string; title: string; companyId: string; approvalStatus: string };
type CampaignOutput = { id: string; platform: string; headline: string | null; bodyCaption: string | null; cta: string | null; status: string; approvedAt: string | null };
type MediaAsset = { id: string; title: string; filePath: string; mimeType: string; assetType: string; platform: string | null; sourceType: string; approvalStatus: string };
type Storyboard = { id: string; title: string; targetDuration: string; status: string; approvedAt: string | null; scenes: Array<{ id: string; sequenceNumber: number; durationSeconds: number; scenePurpose: string; visualRecommendation: string; headlineCaption: string; voiceoverText: string | null; transition: string | null; cta: string | null }> };

async function post(url: string, body: Record<string, unknown>, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function StudioWizard({ companies, campaigns }: { companies: Company[]; campaigns: Campaign[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [outputs, setOutputs] = useState<CampaignOutput[]>([]);
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [posterFallback, setPosterFallback] = useState<{ campaignId: string; platform: string; reason: string } | null>(null);
  const selected = companies[0];
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-3">
        <div><div className="text-xs font-semibold uppercase text-slate-500">Step 1</div><h3 className="font-semibold">Business</h3><p className="mt-1 text-sm text-slate-500">{selected?.brandProfile?.approvalStatus === "APPROVED" ? "Approved Brand Kit ready" : "No approved Brand Kit. Safe defaults will be used."}</p></div>
        <div><div className="text-xs font-semibold uppercase text-slate-500">Step 2-4</div><h3 className="font-semibold">Source and approval</h3><p className="mt-1 text-sm text-slate-500">Extract structured details, edit them, then approve before generation.</p></div>
        <div><div className="text-xs font-semibold uppercase text-slate-500">Step 5-7</div><h3 className="font-semibold">Generate and review</h3><p className="mt-1 text-sm text-slate-500">Create platform copy, posters, storyboard, exports and placements.</p></div>
      </div>
      <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(""); setMessage("");
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          setPosterFallback(null);
          const input = await post("/api/studio/extract", { campaignId: data.campaignId, rawInput: data.rawInput, sourceType: data.sourceType });
          await post("/api/studio/extract", { campaignId: data.campaignId, structuredDetailsJson: input.structuredDetailsJson, approved: true }, "PATCH");
          const generated = await post("/api/studio/generate", { campaignId: data.campaignId, platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP", "REEL"] });
          let poster: MediaAsset | null = null;
          try {
            poster = await post("/api/studio/poster", { campaignId: data.campaignId, platform: data.platform });
          } catch (posterError) {
            setPosterFallback({ campaignId: String(data.campaignId), platform: String(data.platform), reason: posterError instanceof Error ? posterError.message : "Poster generation failed." });
          }
          const board = await post("/api/studio/storyboard", { campaignId: data.campaignId });
          setOutputs(generated);
          setMedia(poster);
          setStoryboard(board);
          setMessage(poster ? "Studio Intelligence generated content, a poster, and a storyboard." : "Studio Intelligence generated content and a storyboard. Upload your poster or generate a template poster to continue media review.");
          router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Studio generation failed"); }
        finally { setBusy(false); }
      }}>
        <label className="grid gap-1 text-sm font-medium">Campaign<select name="campaignId" required className="rounded-md border border-slate-200 px-3 py-2">{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Source type<select name="sourceType" className="rounded-md border border-slate-200 px-3 py-2"><option>MANUAL</option><option>PRODUCT</option><option>MEDIA</option><option>JOB_DESCRIPTION</option><option>BUSINESS_DESCRIPTION</option></select></label>
        <label className="grid gap-1 text-sm font-medium">Poster format<select name="platform" className="rounded-md border border-slate-200 px-3 py-2"><option>INSTAGRAM</option><option>INSTAGRAM_STORY</option><option>SQUARE</option><option>FACEBOOK</option><option>LINKEDIN</option><option>WHATSAPP</option><option>BANNER</option></select></label>
        <textarea name="rawInput" placeholder="Paste job description, offer, product notes, or campaign brief" className="min-h-36 rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />
        <button disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">{busy ? "Running Studio Intelligence..." : "Run Studio Intelligence"}</button>
        {message && <p className="text-sm text-emerald-700 md:col-span-2">{message}</p>}
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
      </form>
      {posterFallback && <PosterFallbackActions campaignId={posterFallback.campaignId} platform={posterFallback.platform} reason={posterFallback.reason} />}
      {(outputs.length > 0 || media || storyboard) && <CampaignResultPanel outputs={outputs} media={media ? [media] : []} storyboard={storyboard} />}
    </div>
  );
}

export function CampaignActionCard({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"content" | "media" | "storyboard" | "publish" | "video" | "">("");
  const [posterSource, setPosterSource] = useState("ai");
  const [posterQuality, setPosterQuality] = useState("balanced");
  const [posterError, setPosterError] = useState("");
  const platforms = campaign.selectedPlatforms?.length ? campaign.selectedPlatforms : ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP"];
  const canGenerate = campaign.status !== "DRAFT" || campaign.outputs?.length || campaign.product;
  const hasOutputs = Boolean(campaign.outputs?.length);
  const hasMedia = Boolean(campaign.mediaAssets?.length);
  const latestStoryboard = campaign.storyboards?.[0] ?? null;

  async function run(label: string, action: () => Promise<unknown>, success: string, nextPanel?: typeof panel) {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      if (nextPanel) setPanel(nextPanel);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed. Please retry.`);
    } finally {
      setBusy("");
    }
  }

  async function generatePoster(source = posterSource) {
    setBusy("poster");
    setError("");
    setMessage("");
    setPosterError("");
    try {
      await post("/api/studio/poster", { campaignId: campaign.id, platform: platforms[0] ?? "INSTAGRAM", visualSource: source, quality: posterQuality });
      setMessage(source === "template" ? "Template poster created." : "Poster created.");
      setPanel("media");
      router.refresh();
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : "Poster generation failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <button disabled={!canGenerate || busy !== ""} title={!canGenerate ? "Approve campaign input in Create before generation." : undefined} onClick={() => run("content", () => post("/api/studio/generate", { campaignId: campaign.id, platforms }), "Generated content.", "content")} className="rounded bg-slate-950 px-2 py-1 font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500">{busy === "content" ? "Generating..." : hasOutputs ? "Regenerate Content" : "Generate Content"}</button>
        <button disabled={busy !== ""} onClick={() => { void generatePoster(); }} className="rounded bg-slate-100 px-2 py-1 font-semibold disabled:opacity-50">{busy === "poster" ? "Generating Poster..." : hasMedia ? "View Poster" : "Generate Poster"}</button>
        <button disabled={busy !== ""} onClick={() => run("storyboard", () => post("/api/studio/storyboard", { campaignId: campaign.id }), "Storyboard ready.", "storyboard")} className="rounded bg-slate-100 px-2 py-1 font-semibold disabled:opacity-50">{busy === "storyboard" ? "Creating Storyboard..." : "Storyboard"}</button>
        <button type="button" onClick={() => setPanel("media")} className="rounded bg-slate-100 px-2 py-1 font-semibold">View Media</button>
        <button disabled={!hasOutputs || campaign.status === "APPROVED" || busy !== ""} title={!hasOutputs ? "Generate and review content before approval." : undefined} onClick={() => run("approve", () => post("/api/campaigns", { campaignId: campaign.id, action: "APPROVE" }, "PATCH"), "Approved.", "content")} className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800 disabled:bg-slate-100 disabled:text-slate-500">{campaign.status === "APPROVED" ? "Approved ✓" : busy === "approve" ? "Approving..." : "Approve"}</button>
      </div>
      {!canGenerate && <p className="text-xs text-amber-700">Approve campaign input in Create before generation.</p>}
      <div className="grid gap-2 rounded-md bg-slate-50 p-2 text-xs sm:grid-cols-3"><label>Visual Source<select value={posterSource} onChange={(event) => setPosterSource(event.target.value)} className="mt-1 w-full rounded border border-slate-200 px-2 py-1"><option value="ai">AI Generate</option><option value="template">Template</option><option value="existing">Existing Product Image</option><option value="variation">Marketing Variation</option></select></label><label>Quality<select value={posterQuality} onChange={(event) => setPosterQuality(event.target.value)} className="mt-1 w-full rounded border border-slate-200 px-2 py-1"><option value="fast">Fast</option><option value="balanced">Balanced</option><option value="premium">Premium</option></select></label><label>Format<select disabled className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-slate-500"><option>{platforms[0] ?? "INSTAGRAM"}</option></select></label></div>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {posterError && <PosterFallbackActions campaignId={campaign.id} platform={platforms[0] ?? "INSTAGRAM"} reason={posterError} onTemplate={() => { void generatePoster("template"); }} onRetry={() => { void generatePoster("ai"); }} />}
      {panel === "content" && <CampaignResultPanel outputs={campaign.outputs ?? []} media={[]} storyboard={null} />}
      {panel === "media" && <CampaignMediaPanel campaignId={campaign.id} media={campaign.mediaAssets ?? []} />}
      {panel === "storyboard" && <StoryboardPanel storyboard={latestStoryboard} onRegenerate={() => run("storyboard", () => post("/api/studio/storyboard", { campaignId: campaign.id }), "Storyboard regenerated.", "storyboard")} onVideo={() => setPanel("video")} />}
      {panel === "video" && <VideoPanel campaignId={campaign.id} />}
      {panel === "publish" && <PublishPanel />}
    </div>
  );
}

function CampaignResultPanel({ outputs, media, storyboard }: { outputs: CampaignOutput[]; media: MediaAsset[]; storyboard: Storyboard | null }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">{outputs.length > 0 && <div className="grid gap-2">{outputs.slice(0, 4).map((output) => <article key={output.id} className="rounded bg-white p-3"><b>{output.platform}: {output.headline}</b><p className="mt-1 text-slate-600">{output.bodyCaption}</p><p className="mt-1 text-xs text-slate-500">{output.cta}</p></article>)}</div>}{media.map((asset) => <AssetImage key={asset.id} src={asset.filePath} alt={asset.title} className="mt-3 aspect-video w-full rounded-md object-cover" />)}{storyboard && <StoryboardPanel storyboard={storyboard} />}</div>;
}

function CampaignMediaPanel({ campaignId, media }: { campaignId: string; media: MediaAsset[] }) {
  if (!media.length) return <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No media attached to this campaign yet. Generate a poster or upload your poster in Media.</div>;
  return <div className="grid gap-3 rounded-md bg-slate-50 p-3">{media.map((asset) => <article key={asset.id} className="rounded-md bg-white p-3 text-sm"><b>{asset.title}</b><p className="text-xs text-slate-500">{asset.assetType} · Source: {sourceLabel(asset.sourceType)} · {asset.approvalStatus} · {asset.platform ?? "No platform"}</p>{asset.mimeType.startsWith("image/") && <AssetImage src={asset.filePath} alt={asset.title} className="mt-2 aspect-video w-full rounded-md object-contain bg-slate-50" />}<a href={`/studio?section=media&campaignId=${campaignId}`} className="mt-2 inline-flex text-xs font-semibold text-sky-700">Open in Media</a></article>)}</div>;
}

function PosterFallbackActions({ campaignId, platform, reason, onRetry, onTemplate }: { campaignId: string; platform: string; reason: string; onRetry?: () => void; onTemplate?: () => void }) {
  const uploadHref = `/studio?section=media&campaignId=${encodeURIComponent(campaignId)}&platform=${encodeURIComponent(platform)}&assetType=POSTER`;
  return <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">AI poster generation is unavailable.</p><p className="mt-1 text-xs">{reason}</p><div className="mt-3 flex flex-wrap gap-2 text-xs">{onRetry && <button type="button" onClick={onRetry} className="rounded bg-white px-2 py-1 font-semibold">Retry AI Generation</button>}{onTemplate && <button type="button" onClick={onTemplate} className="rounded bg-white px-2 py-1 font-semibold">Generate Template Poster</button>}<a href={uploadHref} className="rounded bg-slate-950 px-2 py-1 font-semibold text-white">Upload My Poster</a></div></div>;
}

function sourceLabel(source?: string | null) {
  if (source === "UPLOADED") return "Uploaded";
  if (source === "GENERATED") return "AI Generated";
  if (source === "ENHANCED") return "Enhanced Upload";
  if (source === "IMPORTED") return "Imported";
  return source ?? "Unknown";
}

function StoryboardPanel({ storyboard, onRegenerate, onVideo }: { storyboard: Storyboard | null; onRegenerate?: () => void; onVideo?: () => void }) {
  if (!storyboard) return <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No storyboard yet. Generate one to review scenes.</div>;
  const brief = storyboard.scenes.map((scene) => `Scene ${scene.sequenceNumber}: ${scene.scenePurpose}\nVisual: ${scene.visualRecommendation}\nCaption: ${scene.headlineCaption}\nDuration: ${scene.durationSeconds}s\nTransition: ${scene.transition ?? "Clean cut"}\nCTA: ${scene.cta ?? "CTA"}${scene.voiceoverText ? `\nVoiceover: ${scene.voiceoverText}` : ""}`).join("\n\n");
  const downloadHref = `data:text/plain;charset=utf-8,${encodeURIComponent(`${storyboard.title}\n${storyboard.targetDuration}s · ${storyboard.status}\n\n${brief}`)}`;
  return <div className="rounded-md bg-slate-50 p-3 text-sm"><div className="flex flex-wrap items-center gap-2"><b>{storyboard.title}</b><span className="text-slate-500">{storyboard.targetDuration}s · {storyboard.status}</span></div><div className="mt-3 grid gap-2">{storyboard.scenes.map((scene) => <article key={scene.id} className="rounded bg-white p-3"><b>Scene {scene.sequenceNumber}: {scene.scenePurpose}</b><p className="mt-1">{scene.visualRecommendation}</p><p className="text-slate-600">{scene.headlineCaption}</p><p className="text-xs text-slate-500">{scene.durationSeconds}s · {scene.transition ?? "Clean cut"} · {scene.cta ?? "CTA"}</p>{scene.voiceoverText && <p className="mt-1 text-xs text-slate-500">{scene.voiceoverText}</p>}</article>)}</div><div className="mt-3 flex flex-wrap gap-2 text-xs">{onRegenerate && <button onClick={onRegenerate} className="rounded bg-slate-100 px-2 py-1 font-semibold">Regenerate Storyboard</button>}<button disabled className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-500" title="Storyboard approval is included with campaign approval for V1.">Approve Storyboard</button><button type="button" onClick={() => navigator.clipboard.writeText(brief)} className="rounded bg-slate-100 px-2 py-1 font-semibold">Copy Storyboard</button><a href={downloadHref} download={`${storyboard.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-storyboard.txt`} className="rounded bg-slate-100 px-2 py-1 font-semibold">Download Storyboard</a>{onVideo && <button onClick={onVideo} className="rounded bg-slate-100 px-2 py-1 font-semibold">Create Video/Reel</button>}</div></div>;
}

function VideoPanel({ campaignId }: { campaignId: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const job = await post("/api/studio/video", { campaignId, reelType: data.reelType, style: data.style, format: data.format, quality: data.quality });
      if (job.status === "FAILED") throw new Error(job.errorMessage ?? "Video generation is not available yet.");
      setMessage("Video job queued. Check Processing for status.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Video generation failed";
      setError(message.toLowerCase().includes("not configured") ? "Video generation is not available yet." : message);
    } finally {
      setBusy(false);
    }
  }}><select name="reelType" className="rounded border border-slate-200 px-2 py-1"><option value="QUICK_REEL">Quick Reel</option><option value="RECRUITMENT_REEL">Recruitment Reel</option><option value="PROMOTIONAL_VIDEO">Promotional Video</option></select><select name="style" className="rounded border border-slate-200 px-2 py-1"><option>Professional</option><option>Lifestyle</option><option>Cinematic</option><option>Product Focus</option><option>Recruitment</option><option>Food/Hospitality</option></select><select name="format" className="rounded border border-slate-200 px-2 py-1"><option value="portrait">Vertical 9:16</option><option value="square">Square</option><option value="landscape">Landscape</option></select><select name="quality" className="rounded border border-slate-200 px-2 py-1"><option value="standard">Standard</option><option value="premium">Premium</option></select><button disabled={busy} className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:col-span-2">{busy ? "Creating video job..." : "Create Video/Reel"}</button>{message && <p className="text-emerald-700 sm:col-span-2">{message}</p>}{error && <p className="text-amber-700 sm:col-span-2">{error}</p>}</form>;
}

function PublishPanel() {
  return <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Connect Meta account in Settings before publishing.</div>;
}

export function UseInBusinessForm({ media, campaigns }: { media: Media[]; campaigns: Campaign[] }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  return <div className="space-y-3"><button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Use in Business / Commerce</button>{open && <form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const asset = media.find((item) => item.id === data.mediaAssetId); try { await post("/api/studio/placements", { ...data, companyId: asset?.companyId, active: true }); setMessage("Media placed in business."); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Placement failed"); setMessage(""); } }}><label className="grid gap-1 text-sm font-medium">Approved Media<select name="mediaAssetId" className="rounded-md border border-slate-200 px-3 py-2">{media.map((m) => <option key={m.id} value={m.id}>{m.title} · {m.approvalStatus}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Campaign<select name="campaignId" className="rounded-md border border-slate-200 px-3 py-2"><option value="">No campaign</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Placement Type<select name="placement" className="rounded-md border border-slate-200 px-3 py-2"><option>ORDERING_HOMEPAGE_HERO</option><option>ORDERING_PROMOTIONAL_BANNER</option><option>ORDERING_PRODUCT_IMAGE</option><option>ORDERING_SPECIAL_OFFER</option><option>COMPANY_PROFILE</option><option>RECRUITMENT_JOB_PAGE</option></select></label><label className="grid gap-1 text-sm font-medium">CTA<input name="cta" placeholder="Optional call to action" className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Destination URL<input name="destinationUrl" placeholder="Optional destination URL" className="rounded-md border border-slate-200 px-3 py-2" /></label><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Use in Business</button>{message && <p className="text-sm text-emerald-700">{message}</p>}{error && <p className="text-sm text-red-600">{error}</p>}</form>}</div>;
}

export function MediaApprovalActions({ assetId, companyId, campaignId, approvalStatus, mediaPath = "", caption = "", hashtags = "" }: { assetId: string; companyId?: string; campaignId?: string | null; approvalStatus: string; mediaPath?: string; caption?: string; hashtags?: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(approvalStatus);
  const [dialog, setDialog] = useState<"publish" | "formats" | "">("");
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  async function update(approvalStatus: string) {
    try {
      await post(`/api/media-library/${assetId}`, { approvalStatus, approvedBy: "single-admin", approvalNotes: approvalStatus === "APPROVED" ? "Approved inside Studio workspace" : "", usageType: "GENERAL_MARKETING" }, "PATCH");
      setMessage(approvalStatus);
      setStatus(approvalStatus);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      setMessage("");
    }
  }
  return <div className="mt-3 space-y-3 text-xs"><div className="flex flex-wrap items-center gap-2">{status === "DRAFT" && <button type="button" onClick={() => update("PENDING_REVIEW")} className="rounded bg-slate-100 px-2 py-1 font-semibold">Submit for Review</button>}{status !== "APPROVED" && status !== "ARCHIVED" && <button type="button" onClick={() => update("APPROVED")} className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">Approve</button>}{status !== "REJECTED" && status !== "ARCHIVED" && <button type="button" onClick={() => update("REJECTED")} className="rounded bg-red-100 px-2 py-1 font-semibold text-red-800">Reject</button>}<button type="button" onClick={() => setSecondaryOpen((value) => !value)} className="rounded bg-slate-100 px-2 py-1 font-semibold">More</button>{message && <span className="text-emerald-700">Saved: {message}</span>}{error && <span className="text-red-600">{error}</span>}</div>{secondaryOpen && <div className="flex flex-wrap gap-2 rounded-md bg-slate-50 p-2"><button type="button" onClick={() => update("DRAFT")} className="rounded bg-white px-2 py-1">Save Draft</button><button type="button" onClick={() => update("ARCHIVED")} className="rounded bg-white px-2 py-1">Archive</button></div>}{status === "APPROVED" && <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-emerald-950"><p className="font-semibold">Create from this media</p><div className="mt-2 flex flex-wrap gap-2"><a href={campaignId ? `/studio?section=campaigns&campaignId=${campaignId}` : "/studio?section=campaigns"} className="rounded bg-white px-2 py-1 font-semibold">Create Reel / Video</a><button type="button" onClick={() => setDialog("formats")} className="rounded bg-white px-2 py-1 font-semibold">Create Another Format</button><button type="button" onClick={() => setDialog("publish")} className="rounded bg-slate-950 px-2 py-1 font-semibold text-white">Publish to Social</button></div></div>}{dialog === "publish" && <StudioOverlay title="Publish to Social" onClose={() => setDialog("")}><PublishForm assetId={assetId} companyId={companyId} campaignId={campaignId} mediaPath={mediaPath} initialCaption={caption} initialHashtags={hashtags} /></StudioOverlay>}{dialog === "formats" && <StudioOverlay title="Create Another Format" onClose={() => setDialog("")}><FormatSelector campaignId={campaignId} /></StudioOverlay>}</div>;
}

function StudioOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label={title}><div className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"><div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3"><h2 className="mr-auto text-sm font-semibold">{title}</h2><button type="button" onClick={onClose} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">Close</button></div><div className="overflow-auto p-4">{children}</div></div></div>;
}

function FormatSelector({ campaignId }: { campaignId?: string | null }) {
  const formats = [
    ["INSTAGRAM_SQUARE", "Instagram Square", "1080 x 1080"],
    ["INSTAGRAM", "Instagram Portrait", "1080 x 1350"],
    ["INSTAGRAM_STORY", "Instagram Story", "1080 x 1920"],
    ["FACEBOOK", "Facebook Post", "1200 x 630"],
    ["LINKEDIN", "LinkedIn Post", "1200 x 627"],
    ["WHATSAPP", "WhatsApp Creative", "1080 x 1080"],
  ];
  return <div className="grid gap-2 text-sm">{formats.map(([value, label, size]) => <a key={value} href={`/studio?section=create${campaignId ? `&campaignId=${encodeURIComponent(campaignId)}` : ""}&format=${encodeURIComponent(value)}`} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 font-semibold"><span>{label}</span><span className="text-xs font-normal text-slate-500">{size}</span></a>)}</div>;
}

function PublishForm({ assetId, companyId, campaignId, mediaPath, initialCaption, initialHashtags }: { assetId: string; companyId?: string; campaignId?: string | null; mediaPath: string; initialCaption: string; initialHashtags: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"checking" | "manual" | "meta">(companyId ? "checking" : "manual");
  const [caption, setCaption] = useState(initialCaption);
  const [hashtags, setHashtags] = useState(initialHashtags);
  const mediaHref = normalizePublicAssetPath(mediaPath);
  const fullPost = `${caption.trim()}${hashtags.trim() ? `\n\n${hashtags.trim()}` : ""}`.trim();
  useEffect(() => {
    if (!companyId) return;
    let active = true;
    fetch(`/api/studio/social/publish?companyId=${encodeURIComponent(companyId)}`).then((response) => response.json()).then((json) => {
      if (active) setMode(json.ready ? "meta" : "manual");
    }).catch(() => {
      if (active) setMode("manual");
    });
    return () => {
      active = false;
    };
  }, [companyId]);
  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setMessage(`${label} copied.`);
    setError("");
  }
  if (mode === "checking") return <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">Checking social publishing connection...</div>;
  if (mode === "manual") return <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><div><p className="font-semibold">Social publishing is not connected yet.</p><p className="mt-1 text-xs text-amber-800">You can download the approved media and publish manually, or connect Meta later from Settings.</p></div><div className="grid gap-2"><p className="text-xs font-semibold uppercase text-amber-900">Media</p><a href={mediaHref} download className="w-fit rounded bg-white px-3 py-2 text-xs font-semibold">Download Media</a></div><label className="grid gap-1 text-xs font-semibold uppercase text-amber-900">Caption<textarea value={caption} onChange={(event) => setCaption(event.target.value)} className="min-h-20 rounded border border-amber-200 bg-white px-2 py-1 text-sm font-normal normal-case text-slate-950" /></label><button type="button" onClick={() => void copy(caption, "Caption")} className="w-fit rounded bg-white px-3 py-2 text-xs font-semibold">Copy Caption</button><label className="grid gap-1 text-xs font-semibold uppercase text-amber-900">Hashtags<textarea value={hashtags} onChange={(event) => setHashtags(event.target.value)} className="min-h-14 rounded border border-amber-200 bg-white px-2 py-1 text-sm font-normal normal-case text-slate-950" /></label><button type="button" onClick={() => void copy(hashtags, "Hashtags")} className="w-fit rounded bg-white px-3 py-2 text-xs font-semibold">Copy Hashtags</button><div className="grid gap-1"><p className="text-xs font-semibold uppercase text-amber-900">Full Post</p><pre className="whitespace-pre-wrap rounded bg-white p-2 text-sm text-slate-700">{fullPost || "Add a caption or hashtags to prepare the full post."}</pre><button type="button" onClick={() => void copy(fullPost, "Full post")} className="w-fit rounded bg-white px-3 py-2 text-xs font-semibold">Copy Full Post</button></div><div className="flex flex-wrap gap-2 text-xs">{["Instagram", "Facebook", "LinkedIn", "WhatsApp"].map((platform) => <span key={platform} className="rounded bg-white px-2 py-1">{platform}</span>)}</div><a href="/studio?section=settings" className="w-fit rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Connect Meta Later</a>{message && <p className="text-emerald-700">{message}</p>}{error && <p className="text-red-600">{error}</p>}</div>;
  return <form className="grid gap-2 rounded-md bg-slate-50 p-3" onSubmit={async (event) => {
    event.preventDefault();
    setMessage(""); setError("");
    if (!companyId) { setError("Company is required for publishing."); return; }
    const form = new FormData(event.currentTarget);
    try {
      await post("/api/studio/social/publish", { companyId, campaignId: campaignId ?? "", mediaAssetId: assetId, platforms: form.getAll("platform"), caption: form.get("caption"), hashtags: form.get("hashtags"), scheduledAt: form.get("scheduledAt") });
      setMessage("Publish job created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publishing failed");
      setMode("manual");
    }
  }}><div className="flex gap-3"><label className="flex items-center gap-1"><input type="checkbox" name="platform" value="INSTAGRAM" />Instagram</label><label className="flex items-center gap-1"><input type="checkbox" name="platform" value="FACEBOOK" />Facebook</label></div><label className="grid gap-1 font-medium">Caption<textarea name="caption" required placeholder="Caption" defaultValue={initialCaption} className="min-h-20 rounded border border-slate-200 px-2 py-1" /></label><label className="grid gap-1 font-medium">Hashtags<input name="hashtags" defaultValue={initialHashtags} placeholder="#hashtags" className="rounded border border-slate-200 px-2 py-1" /></label><label className="flex items-center gap-2"><input type="checkbox" name="publishNow" defaultChecked />Publish now</label><label className="grid gap-1 font-medium">Schedule date/time<input name="scheduledAt" type="datetime-local" className="rounded border border-slate-200 px-2 py-1" /></label><button className="rounded bg-slate-950 px-3 py-2 font-semibold text-white">Create Publish Job</button>{message && <p className="text-emerald-700">{message}</p>}{error && <p className="text-amber-700">{error}</p>}</form>;
}
