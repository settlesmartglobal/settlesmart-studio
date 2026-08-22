import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { CampaignForm, UploadForm } from "../components/forms";
import { CampaignActionCard, MediaApprovalActions, StudioWizard, UseInBusinessForm } from "../components/studio-actions";
import { BusinessProfileWizardInner } from "../components/business-profile-wizard";
import { AssetImage } from "../components/asset-image";
import { normalizePublicAssetPath } from "@/modules/wave1/assets";
import { toClientBusinessProfile, toClientCompanySummary, toClientProduct } from "@/modules/wave1/serialization";
import { metaConfig, studioImageConfig, studioVideoConfig } from "@/modules/studio/providers/config";
import { getMetaConnection } from "@/modules/studio/providers/social/meta";
import { isPublicHttpsUrl } from "@/modules/studio/storage";

const sections = ["overview", "brand", "create", "campaigns", "media", "processing", "templates", "settings"] as const;
const sectionLabels: Record<(typeof sections)[number], string> = {
  overview: "Overview",
  brand: "Business Profile",
  create: "Create",
  campaigns: "Campaigns",
  media: "Media",
  processing: "Processing",
  templates: "Templates",
  settings: "Settings",
};

const overviewActions = [
  ["Create Campaign", "/studio?section=campaigns"],
  ["Generate Poster", "/studio?section=create"],
  ["Create Social Content", "/studio?section=create"],
  ["Upload Image", "/studio?section=media"],
  ["Upload Video", "/studio?section=media"],
  ["Open Brand Kit", "/studio?section=brand"],
  ["View Media Library", "/studio?section=media"],
] as const;

function completion(company?: Awaited<ReturnType<typeof getWorkspaceData>>["companies"][number]) {
  if (!company) return 0;
  const brand = company.brandProfile;
  const fields = [company.name, company.businessType, company.industry, company.description, company.website, company.email, company.phone, brand?.tagline, brand?.primaryColor, brand?.secondaryColor, brand?.accentColor, brand?.brandTone, brand?.visualStyle, brand?.defaultCallToAction];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

async function getWorkspaceData() {
  const [companies, products, campaigns, mediaAssets, jobs, templates, activities] = await Promise.all([
    prisma.company.findMany({ include: { brandProfile: true }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.studioCampaign.findMany({ include: { company: true, product: true, mediaAssets: true, outputs: true, storyboards: { include: { scenes: { orderBy: { sequenceNumber: "asc" } } } } }, orderBy: { updatedAt: "desc" } }),
    prisma.mediaAsset.findMany({ include: { company: true, campaign: { include: { outputs: true } }, placements: true, inputJobs: true }, orderBy: { updatedAt: "desc" } }),
    prisma.mediaProcessingJob.findMany({ include: { company: true, campaign: true, inputMediaAsset: true, outputMediaAsset: true }, orderBy: { createdAt: "desc" } }),
    prisma.studioTemplate.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.studioActivity.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  return { companies, products, campaigns, mediaAssets, jobs, templates, activities };
}

export default async function StudioWorkspace({ searchParams }: { searchParams: Promise<{ section?: string; company?: string; mode?: string; campaignId?: string; status?: string; platform?: string; assetType?: string }> }) {
  const params = await searchParams;
  const active = sections.includes(params.section as never) ? params.section ?? "overview" : "overview";
  const data = await getWorkspaceData();
  const requestedCompany = "company" in params ? String((params as { company?: string }).company ?? "") : "";
  const profileMode = params.mode === "create" ? "create" : "edit";
  const company = data.companies.find((item) => item.slug === requestedCompany || item.id === requestedCompany) ?? data.companies.find((item) => item.slug === "settlesmart-works") ?? data.companies[0];
  const mediaCampaignId = "campaignId" in params ? String((params as { campaignId?: string }).campaignId ?? "") : "";
  const mediaStatus = "status" in params ? String((params as { status?: string }).status ?? "") : "";
  const scopedCampaigns = company ? data.campaigns.filter((campaign) => campaign.companyId === company.id) : data.campaigns;
  const scopedMedia = (company ? data.mediaAssets.filter((asset) => asset.companyId === company.id) : data.mediaAssets).filter((asset) => (!mediaCampaignId || asset.campaignId === mediaCampaignId) && (!mediaStatus || asset.approvalStatus === mediaStatus));
  const scopedJobs = company ? data.jobs.filter((job) => job.companyId === company.id) : data.jobs;
  const scopedProducts = company ? data.products.filter((product) => product.companyId === company.id) : data.products;
  const brandCompletion = completion(company);
  const approvedCampaigns = scopedCampaigns.filter((campaign) => campaign.status === "APPROVED").length;
  const draftCampaigns = scopedCampaigns.filter((campaign) => campaign.status === "DRAFT").length;
  const approvedMedia = scopedMedia.filter((asset) => asset.approvalStatus === "APPROVED").length;
  const draftMedia = scopedMedia.filter((asset) => asset.approvalStatus === "DRAFT").length;
  const readyToPublish = scopedMedia.filter((asset) => asset.approvalStatus === "APPROVED" && asset.category === "SOCIAL").length;
  const imageConfig = studioImageConfig();
  const videoConfig = studioVideoConfig();
  const socialConfig = metaConfig();
  const metaConnection = company ? await getMetaConnection(company.id) : null;
  const publicStorageReady = isPublicHttpsUrl(process.env.NEXT_PUBLIC_APP_URL ?? "");
  const imageReadiness = imageConfig.mode === "openai" && imageConfig.configured && imageConfig.model ? "READY" : imageConfig.mode === "openai" ? "PARTIAL" : "NOT CONFIGURED";
  const videoReadiness = videoConfig.mode === "openai" && videoConfig.configured && process.env.OPENAI_WEBHOOK_SECRET && publicStorageReady ? "READY" : videoConfig.mode === "openai" && videoConfig.configured ? "PARTIAL" : "NOT CONFIGURED";
  const metaReadiness = socialConfig.configured && metaConnection?.status === "CONNECTED" && metaConnection.facebookPageId && metaConnection.instagramAccountId && publicStorageReady ? "READY" : socialConfig.configured || metaConnection?.status === "CONNECTED" ? "PARTIAL" : "NOT CONFIGURED";
  const clientCompanies = (company ? [company] : data.companies).map(toClientCompanySummary);
  const clientBusinessProfile = company ? toClientBusinessProfile(company) : undefined;
  const existingBusinesses = data.companies.map((item) => ({ id: item.id, name: item.name, slug: item.slug }));
  const companyQuery = company ? `&company=${encodeURIComponent(company.slug)}` : "";
  const clientCampaigns = scopedCampaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective,
    campaignType: campaign.campaignType,
    selectedPlatforms: Array.isArray(campaign.selectedPlatformsJson) ? campaign.selectedPlatformsJson.map(String) : [],
    product: campaign.product ? toClientProduct(campaign.product) : null,
    outputs: campaign.outputs.map((output) => ({
      id: output.id,
      platform: output.platform,
      headline: output.headline,
      bodyCaption: output.bodyCaption,
      cta: output.cta,
      status: output.status,
      approvedAt: output.approvedAt?.toISOString() ?? null,
    })),
    mediaAssets: campaign.mediaAssets.map((asset) => ({
      id: asset.id,
      title: asset.title,
      filePath: asset.filePath,
      mimeType: asset.mimeType,
      assetType: asset.assetType,
      platform: asset.platform,
      sourceType: asset.sourceType,
      approvalStatus: asset.approvalStatus,
    })),
    storyboards: campaign.storyboards.map((storyboard) => ({
      id: storyboard.id,
      title: storyboard.title,
      targetDuration: storyboard.targetDuration,
      status: storyboard.status,
      approvedAt: storyboard.approvedAt?.toISOString() ?? null,
      scenes: storyboard.scenes.map((scene) => ({
        id: scene.id,
        sequenceNumber: scene.sequenceNumber,
        durationSeconds: scene.durationSeconds,
        scenePurpose: scene.scenePurpose,
        visualRecommendation: scene.visualRecommendation,
        headlineCaption: scene.headlineCaption,
        voiceoverText: scene.voiceoverText,
        transition: scene.transition,
        cta: scene.cta,
      })),
    })),
  }));
  const clientProducts = scopedProducts.map(toClientProduct);
  const clientMedia = scopedMedia.map(({ id, title, companyId, approvalStatus }) => ({ id, title, companyId, approvalStatus }));

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="mr-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">SettleSmart Works</p>
              <h1 className="text-2xl font-semibold">SettleSmart Studio™</h1>
              <p className="text-sm text-slate-500">AI-Powered Marketing & Brand Operations Platform</p>
            </div>
            <form action="/studio" className="flex items-center gap-2"><input type="hidden" name="section" value={active} /><select name="company" defaultValue={company?.slug ?? ""} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" aria-label="Active business profile">{data.companies.length === 0 ? <option>No business profile</option> : data.companies.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select><button className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold">Switch</button></form>
            <Link href="/studio?section=brand&mode=create" className="rounded-md border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">+ Add Business</Link>
            <Link href={`/studio?section=create${companyQuery}`} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Create Content</Link>
            <Link href={`/studio?section=media${companyQuery}`} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Upload Media</Link>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto">
            {sections.map((section) => <Link key={section} href={`/studio?section=${section}${companyQuery}`} className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${active === section ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>{sectionLabels[section]}</Link>)}
          </nav>
        </header>

        <section className="mt-5 flex-1">
          {active === "overview" && <WorkspacePanel>{data.companies.length === 0 ? <EmptyStudio /> : <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Metric label="Campaigns" value={String(scopedCampaigns.length)} /><Metric label="Approved media" value={String(approvedMedia)} /><Metric label="Draft media" value={String(draftMedia)} /><Metric label="Ready to publish" value={String(readyToPublish)} /></div><div className="grid gap-4 md:grid-cols-4"><Metric label="Processing jobs" value={String(scopedJobs.length)} /><Metric label="Active business" value={company?.name ?? "None"} /><Metric label="Brand Kit" value={`${brandCompletion}%`} /><Metric label="Meta publishing" value={metaReadiness} /></div>{!company?.brandProfile && <Warning title="Complete Brand Kit" body="Brand context is missing. Studio can continue with safe defaults, but approved brand details improve output quality." href={`/studio?section=brand${companyQuery}`} />}{brandCompletion < 70 && <Warning title="Brand Kit needs attention" body="Add logo, tone, CTA, visual style and brand colors before external use." href={`/studio?section=brand${companyQuery}`} />}<div className="grid gap-4 lg:grid-cols-2"><Card title="Quick actions"><div className="grid gap-2 sm:grid-cols-2">{overviewActions.map(([label, href]) => <Link key={label} href={`${href}${companyQuery}`} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">{label}</Link>)}</div></Card><Card title="Recent activity">{data.activities.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : data.activities.map((a) => <p key={a.id} className="border-b border-slate-100 py-2 text-sm">{a.summary}</p>)}</Card></div><Card title="Recently created media"><MediaGrid media={scopedMedia.slice(0, 4)} /></Card></div>}</WorkspacePanel>}
          {active === "brand" && <WorkspacePanel><BusinessProfileWizardInner key={`${profileMode}-${profileMode === "create" ? "new" : company?.id ?? "none"}`} company={profileMode === "create" ? undefined : clientBusinessProfile} mode={profileMode} companyId={profileMode === "create" ? undefined : company?.id} existingBusinesses={existingBusinesses} /></WorkspacePanel>}
          {active === "create" && <WorkspacePanel><StudioWizard companies={clientCompanies} campaigns={clientCampaigns} /></WorkspacePanel>}
          {active === "campaigns" && <WorkspacePanel><div className="mb-4 grid gap-4 md:grid-cols-3"><Metric label="Total campaigns" value={String(scopedCampaigns.length)} /><Metric label="Draft" value={String(draftCampaigns)} /><Metric label="Approved" value={String(approvedCampaigns)} /></div><Card title="Launch your next AI campaign"><CampaignForm companies={clientCompanies} products={clientProducts} /></Card><div className="mt-5 grid gap-4 md:grid-cols-2">{scopedCampaigns.map((campaign, index) => <Card key={campaign.id} title={campaign.name}><p className="text-sm text-slate-500">{campaign.status} · {campaign.campaignType} · {campaign.company.name}</p><p className="mt-2 text-sm">{campaign.objective}</p><CampaignActionCard campaign={clientCampaigns[index]} /></Card>)}</div></WorkspacePanel>}
          {active === "media" && <WorkspacePanel><div className="grid gap-5 lg:grid-cols-[340px_1fr]"><div className="space-y-5"><Card title="Upload creative"><UploadForm companies={clientCompanies} campaigns={clientCampaigns} products={clientProducts} /></Card><Card title="Business / Commerce usage"><UseInBusinessForm media={clientMedia} campaigns={clientCampaigns} /></Card></div><div className="space-y-4"><Card title="Find assets"><form className="grid gap-2 text-sm md:grid-cols-4"><input type="hidden" name="section" value="media" /><input type="hidden" name="company" value={company?.slug ?? ""} /><select name="campaignId" defaultValue={mediaCampaignId} className="rounded-md border border-slate-200 px-3 py-2"><option value="">All campaigns</option>{scopedCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select><select name="status" defaultValue={mediaStatus} className="rounded-md border border-slate-200 px-3 py-2"><option value="">All statuses</option>{["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"].map((status) => <option key={status}>{status}</option>)}</select><button className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Apply filters</button><Link href={`/studio?section=media&company=${company?.slug ?? ""}`} className="rounded-md bg-slate-100 px-3 py-2 text-center font-semibold">Clear</Link></form></Card><MediaGrid media={scopedMedia} /></div></div></WorkspacePanel>}
          {active === "processing" && <WorkspacePanel>{scopedJobs.length === 0 ? <Card title="Processing"><p className="text-sm text-slate-500">No jobs yet.</p></Card> : <div className="grid gap-4">{scopedJobs.map((job) => <ProcessingJobCard key={job.id} job={job} providerReady={metaReadiness === "READY"} />)}</div>}</WorkspacePanel>}
          {active === "templates" && <WorkspacePanel><TemplateGrid templates={data.templates} /></WorkspacePanel>}
          {active === "settings" && <WorkspacePanel><div className="grid gap-5 lg:grid-cols-2"><Card title="AI Generation"><dl className="space-y-3 text-sm"><Row label="Image readiness" value={imageReadiness} /><Row label="Image model" value={imageConfig.model} /><Row label="Image quality" value={imageConfig.quality} /><Row label="Video readiness" value={videoReadiness} /><Row label="Video model" value={videoConfig.model} /><Row label="Premium video" value={videoConfig.premiumModel} /><Row label="Webhook" value={process.env.OPENAI_WEBHOOK_SECRET ? "Configured" : "Required for completion"} /></dl></Card><Card title="Social Publishing"><dl className="grid gap-3 text-sm"><Row label="Meta readiness" value={metaReadiness} /><Row label="Meta app" value={socialConfig.configured ? "Configured" : "Configuration required"} /><Row label="Connection" value={metaConnection?.status ?? "Not connected"} /><Row label="Facebook Page" value={metaConnection?.facebookPageName ?? "Not connected"} /><Row label="Instagram Account" value={metaConnection?.instagramUsername ?? "Not connected"} /><Row label="Permissions" value={metaConnection?.grantedScopes?.join(", ") ?? "Not granted"} /></dl>{company && <a href={`/api/studio/social/meta/connect?companyId=${company.id}`} className="mt-4 inline-flex rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Connect Meta</a>}<p className="mt-3 text-xs text-slate-500">Publishing blocks localhost media and requires public HTTPS storage.</p></Card><Card title="Publishing and Storage"><dl className="space-y-3 text-sm"><Row label="Storage provider" value={process.env.STUDIO_STORAGE_PROVIDER ?? "local"} /><Row label="Public URL readiness" value={publicStorageReady ? "READY" : "PARTIAL"} /><Row label="Cron endpoint" value={process.env.STUDIO_CRON_SECRET ? "READY" : "NOT CONFIGURED"} /><Row label="Default Business Profile" value={company?.name ?? "Not set"} /><Row label="Default language" value={company?.preferredLanguage ?? "English"} /></dl></Card><Card title="Commerce Integration"><p className="text-sm text-slate-500">SettleSmart Commerce™ consumes approved Studio media through `/api/studio/media/approved` and MediaPlacement records.</p><p className="mt-3 text-sm text-slate-500">Uploads: {process.env.UPLOAD_DIR ?? "public/uploads"}</p></Card></div></WorkspacePanel>}
        </section>
      </div>
    </main>
  );
}

function WorkspacePanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm">{children}</div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium">{value}</dd></div>;
}

function ProcessingJobCard({ job, providerReady }: { job: Awaited<ReturnType<typeof getWorkspaceData>>["jobs"][number]; providerReady: boolean }) {
  const config = (job.configurationJson ?? {}) as { provider?: string; platform?: string };
  const provider = config.provider ?? (job.providerJobId ? "openai" : "local");
  const blocked = job.failureCode === "META_NOT_CONNECTED" || job.failureCode === "PUBLIC_URL_REQUIRED" || job.errorMessage?.toLowerCase().includes("not configured") || job.errorMessage?.toLowerCase().includes("not connected");
  return <Card title={job.jobType}><div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">{job.status}</span><span className="text-slate-500">{job.progress}% · {job.company.name}</span>{config.platform && <span className="rounded-md bg-slate-50 px-2 py-1 text-xs">{config.platform}</span>}</div><p className="mt-2 text-xs text-slate-500">{job.inputMediaAsset ? `Input: ${job.inputMediaAsset.title}` : "No input asset"} · {job.outputMediaAsset ? `Output: ${job.outputMediaAsset.title}` : "No output yet"}</p><dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3"><div><dt className="font-semibold text-slate-900">Provider</dt><dd>{provider}</dd></div><div><dt className="font-semibold text-slate-900">Created</dt><dd>{job.createdAt.toLocaleString()}</dd></div><div><dt className="font-semibold text-slate-900">Failure reason</dt><dd>{blocked ? "Provider not configured" : job.errorMessage ?? job.failureCode ?? "None"}</dd></div></dl>{job.errorMessage && <p className="mt-2 text-sm text-red-600">{job.errorMessage}</p>}{job.status === "FAILED" && providerReady ? <button disabled title="Retry worker is not configured for V1." className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">Retry unavailable</button> : job.status === "FAILED" ? <p className="mt-3 text-sm text-slate-500">Provider not configured</p> : job.status === "COMPLETED" && job.outputMediaAsset ? <a href={`/studio?section=media&campaignId=${job.campaignId ?? ""}`} className="mt-3 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">View Output</a> : job.status === "PUBLISHED" && job.publishedUrl ? <a href={job.publishedUrl} target="_blank" className="mt-3 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">View Published Post</a> : blocked ? <p className="mt-3 text-sm text-slate-500">Provider not configured</p> : null}</Card>;
}

function Warning({ title, body, href }: { title: string; body: string; href: string }) {
  return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><h2 className="font-semibold text-amber-950">{title}</h2><p className="mt-1 text-sm text-amber-800">{body}</p><Link className="mt-3 inline-flex rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white" href={href}>Open</Link></div>;
}

function EmptyStudio() {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-semibold">Create your first Business Profile</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">SettleSmart Studio needs one editable business profile before Brand Kit, campaigns and media intelligence can begin.</p><Link href="/studio?section=brand" className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Create Business Profile</Link></div>;
}

function hashtagToken(value?: string | null) {
  return (value ?? "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter((word) => word.length > 2).slice(0, 4).map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase()).join("");
}

function recruitmentHashtags(asset: Awaited<ReturnType<typeof getWorkspaceData>>["mediaAssets"][number], existing: string) {
  const campaignText = [asset.title, asset.category, asset.campaign?.name, asset.campaign?.campaignType, asset.campaign?.objective].filter(Boolean).join(" ");
  const recruitment = /recruit|career|hiring|job|vacancy|role|opening/i.test(campaignText);
  if (!recruitment) return existing;
  const role = hashtagToken(asset.campaign?.name ?? asset.title);
  const locationMatch = campaignText.match(/\b(Hyderabad|Bengaluru|Bangalore|Chennai|Mumbai|Delhi|Pune|Kochi|Coimbatore|Gurgaon|Noida|Remote)\b/i);
  const location = locationMatch ? hashtagToken(locationMatch[0]) : "";
  const tags = ["#SettleSmartCareers", "#Hiring", "#Jobs", role ? `#${role}` : "", location ? `#${location}Jobs` : ""].filter(Boolean);
  return Array.from(new Set(tags)).join(" ");
}

function MediaGrid({ media }: { media: Awaited<ReturnType<typeof getWorkspaceData>>["mediaAssets"] }) {
  if (media.length === 0) return <p className="text-sm text-slate-500">No media yet.</p>;
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{media.map((asset) => { const published = asset.inputJobs?.find((job) => job.publishedUrl); const metadata = (asset.metadataJson ?? {}) as { dimensionWarning?: string; templateMode?: string; provider?: string; caption?: string }; const output = asset.campaign?.outputs.find((item) => item.platform === asset.platform) ?? asset.campaign?.outputs[0]; const outputHashtags = Array.isArray(output?.hashtagsJson) ? output.hashtagsJson.map(String).join(" ") : ""; const hashtags = recruitmentHashtags(asset, outputHashtags); const caption = metadata.caption || output?.bodyCaption || asset.campaign?.objective || ""; return <article key={asset.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="font-semibold">{asset.title}</div><p className="mt-1 text-xs text-slate-500">{asset.campaign?.name ?? "No campaign"} · {asset.assetType} · Source: {sourceLabel(asset.sourceType, metadata)} · {asset.approvalStatus} · {asset.platform ?? "No platform"}</p>{metadata.dimensionWarning && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">{metadata.dimensionWarning}</p>}{asset.mimeType.startsWith("image/") && <AssetImage src={asset.filePath} alt={asset.title} className="mt-3 aspect-video w-full rounded-md object-contain bg-slate-50" />}{asset.mimeType.startsWith("video/") && <video src={normalizePublicAssetPath(asset.filePath)} controls className="mt-3 aspect-video w-full rounded-md" />}<div className="mt-3 flex flex-wrap gap-2 text-xs"><a href={normalizePublicAssetPath(asset.filePath)} target="_blank" className="rounded bg-slate-100 px-2 py-1 font-semibold">Preview</a><a href={normalizePublicAssetPath(asset.filePath)} download className="rounded bg-slate-100 px-2 py-1 font-semibold">Download</a>{published?.publishedUrl && <a href={published.publishedUrl} target="_blank" className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">View Published Post</a>}<span className="rounded bg-slate-100 px-2 py-1">Placements {asset.placements?.length ?? 0}</span></div><MediaApprovalActions assetId={asset.id} companyId={asset.companyId} campaignId={asset.campaignId} approvalStatus={asset.approvalStatus} mediaPath={asset.filePath} caption={caption} hashtags={hashtags} /></article>; })}</div>;
}

function sourceLabel(source?: string | null, metadata?: { templateMode?: string; provider?: string }) {
  if (source === "UPLOADED") return "Uploaded";
  if (source === "GENERATED" && metadata?.templateMode) return "Template Generated";
  if (source === "GENERATED") return metadata?.provider === "openai" ? "AI Generated" : "Generated";
  if (source === "ENHANCED") return "Enhanced Upload";
  if (source === "IMPORTED") return "Imported";
  return source ?? "Unknown";
}

function TemplateGrid({ templates }: { templates: Awaited<ReturnType<typeof getWorkspaceData>>["templates"] }) {
  const fallback = [
    ["Restaurant", "Instagram Post", "1080x1350"],
    ["Retail", "Offer Poster", "1080x1080"],
    ["Recruitment", "Recruitment Poster", "1200x628"],
    ["Corporate", "LinkedIn Post", "1200x628"],
    ["Hospitality", "Website Banner", "1600x600"],
    ["Healthcare", "WhatsApp Poster", "1080x1350"],
    ["Education", "Instagram Story", "1080x1920"],
    ["Real Estate", "Product Promotion", "1080x1350"],
  ];
  const rows = templates.length ? templates.map((t) => [t.category, t.templateType, `${t.width}x${t.height}`]) : fallback;
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{rows.map(([category, type, size]) => <Card key={`${category}-${type}`} title={String(category)}><p className="text-sm font-semibold">{type}</p><p className="mt-1 text-sm text-slate-500">{size}</p><p className="mt-3 text-xs text-slate-500">Brand-compatible · Active</p><Link href={`/studio?section=create&template=${encodeURIComponent(String(type))}`} className="mt-3 inline-flex rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Use Template</Link></Card>)}</div>;
}
