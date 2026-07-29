import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { CampaignForm, UploadForm } from "../components/forms";
import { MediaApprovalActions, StudioWizard, UseInBusinessForm } from "../components/studio-actions";
import { BusinessProfileWizard } from "../components/business-profile-wizard";
import { AssetImage } from "../components/asset-image";
import { normalizePublicAssetPath } from "@/modules/wave1/assets";

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
    prisma.studioCampaign.findMany({ include: { company: true, product: true, mediaAssets: true, outputs: true, storyboards: true }, orderBy: { updatedAt: "desc" } }),
    prisma.mediaAsset.findMany({ include: { company: true, campaign: true, placements: true }, orderBy: { updatedAt: "desc" } }),
    prisma.mediaProcessingJob.findMany({ include: { company: true, campaign: true, inputMediaAsset: true, outputMediaAsset: true }, orderBy: { createdAt: "desc" } }),
    prisma.studioTemplate.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.studioActivity.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  return { companies, products, campaigns, mediaAssets, jobs, templates, activities };
}

export default async function StudioWorkspace({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const params = await searchParams;
  const active = sections.includes(params.section as never) ? params.section ?? "overview" : "overview";
  const data = await getWorkspaceData();
  const company = data.companies.find((item) => item.slug === "settlesmart-works") ?? data.companies[0];
  const scopedCampaigns = company ? data.campaigns.filter((campaign) => campaign.companyId === company.id) : data.campaigns;
  const scopedMedia = company ? data.mediaAssets.filter((asset) => asset.companyId === company.id) : data.mediaAssets;
  const scopedJobs = company ? data.jobs.filter((job) => job.companyId === company.id) : data.jobs;
  const scopedProducts = company ? data.products.filter((product) => product.companyId === company.id) : data.products;
  const brandCompletion = completion(company);
  const approvedCampaigns = scopedCampaigns.filter((campaign) => campaign.status === "APPROVED").length;
  const draftCampaigns = scopedCampaigns.filter((campaign) => campaign.status === "DRAFT").length;
  const approvedMedia = scopedMedia.filter((asset) => asset.approvalStatus === "APPROVED").length;

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
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" aria-label="Active business profile">
              {data.companies.length === 0 ? <option>No business profile</option> : [company, ...data.companies.filter((item) => item.id !== company?.id)].filter(Boolean).map((item) => <option key={item.id}>{item.name}</option>)}
            </select>
            <Link href="/studio?section=create" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Create Content</Link>
            <Link href="/studio?section=media" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Upload Media</Link>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto">
            {sections.map((section) => <Link key={section} href={`/studio?section=${section}`} className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${active === section ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>{sectionLabels[section]}</Link>)}
          </nav>
        </header>

        <section className="mt-5 flex-1">
          {active === "overview" && <WorkspacePanel>{data.companies.length === 0 ? <EmptyStudio /> : <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Metric label="Active business" value={company?.name ?? "None"} /><Metric label="Brand Kit" value={`${brandCompletion}%`} /><Metric label="Campaigns" value={String(scopedCampaigns.length)} /><Metric label="Approved media" value={String(approvedMedia)} /></div>{!company?.brandProfile && <Warning title="Complete Brand Kit" body="Brand context is missing. Studio can continue with safe defaults, but approved brand details improve output quality." href="/studio?section=brand" />}{brandCompletion < 70 && <Warning title="Brand Kit needs attention" body="Add logo, tone, CTA, visual style and brand colors before external use." href="/studio?section=brand" />}<div className="grid gap-4 lg:grid-cols-2"><Card title="Quick actions"><div className="grid gap-2 sm:grid-cols-2">{["Create Campaign", "Generate Poster", "Create Social Content", "Upload Image", "Upload Video", "Open Brand Kit", "View Media Library"].map((item) => <Link key={item} href={`/studio?section=${item.includes("Brand") ? "brand" : item.includes("Media") || item.includes("Upload") ? "media" : "create"}`} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">{item}</Link>)}</div></Card><Card title="Recent activity">{data.activities.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : data.activities.map((a) => <p key={a.id} className="border-b border-slate-100 py-2 text-sm">{a.summary}</p>)}</Card></div><Card title="Recently created media"><MediaGrid media={scopedMedia.slice(0, 4)} /></Card></div>}</WorkspacePanel>}
          {active === "brand" && <WorkspacePanel><BusinessProfileWizard company={company ?? undefined} /></WorkspacePanel>}
          {active === "create" && <WorkspacePanel><StudioWizard companies={company ? [company] : data.companies} campaigns={scopedCampaigns} /></WorkspacePanel>}
          {active === "campaigns" && <WorkspacePanel><div className="mb-4 grid gap-4 md:grid-cols-3"><Metric label="Total campaigns" value={String(scopedCampaigns.length)} /><Metric label="Draft" value={String(draftCampaigns)} /><Metric label="Approved" value={String(approvedCampaigns)} /></div><Card title="Launch your next AI campaign"><CampaignForm companies={company ? [company] : data.companies} products={scopedProducts} /></Card><div className="mt-5 grid gap-4 md:grid-cols-2">{scopedCampaigns.map((campaign) => <Card key={campaign.id} title={campaign.name}><p className="text-sm text-slate-500">{campaign.status} · {campaign.campaignType} · {campaign.company.name}</p><p className="mt-2 text-sm">{campaign.objective}</p><div className="mt-3 flex flex-wrap gap-2 text-xs">{["Generate Content", "Generate Poster", "Storyboard", "View Media", "Approve"].map((action) => <span key={action} className="rounded bg-slate-100 px-2 py-1">{action}</span>)}</div></Card>)}</div></WorkspacePanel>}
          {active === "media" && <WorkspacePanel><div className="grid gap-5 lg:grid-cols-[340px_1fr]"><div className="space-y-5"><Card title="Upload creative"><UploadForm companies={company ? [company] : data.companies} /></Card><Card title="Approved media contract"><UseInBusinessForm media={scopedMedia} campaigns={scopedCampaigns} /></Card></div><div className="space-y-4"><Card title="Find assets"><div className="grid gap-2 text-sm md:grid-cols-5"><input placeholder="Search by title or tag" className="rounded-md border border-slate-200 px-3 py-2" /><span>Campaign</span><span>Type</span><span>Platform</span><span>Status</span></div></Card><MediaGrid media={scopedMedia} /></div></div></WorkspacePanel>}
          {active === "processing" && <WorkspacePanel>{scopedJobs.length === 0 ? <Card title="Processing"><p className="text-sm text-slate-500">No jobs yet.</p></Card> : <div className="grid gap-4">{scopedJobs.map((job) => <Card key={job.id} title={job.jobType}><p className="text-sm text-slate-500">{job.status} · {job.progress}% · {job.company.name}</p>{job.errorMessage && <p className="mt-2 text-sm text-red-600">{job.errorMessage}</p>}<button className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Retry</button></Card>)}</div>}</WorkspacePanel>}
          {active === "templates" && <WorkspacePanel><TemplateGrid templates={data.templates} /></WorkspacePanel>}
          {active === "settings" && <WorkspacePanel><div className="grid gap-5 lg:grid-cols-2"><Card title="Workspace settings"><dl className="space-y-3 text-sm"><div>Default Business Profile: {company?.name ?? "Not set"}</div><div>Default language: {company?.preferredLanguage ?? "English"}</div><div>Demo AI mode: {process.env.STUDIO_AI_MODE ?? "demo"}</div><div>Default export format: Original</div><div>Application status: Ready</div></dl></Card><Card title="Integrations"><p className="text-sm text-slate-500">SettleSmart Commerce™ will consume approved Studio media through `/api/studio/media/approved`.</p><p className="mt-3 text-sm text-slate-500">Media storage: {process.env.UPLOAD_DIR ?? "public/uploads"}</p></Card></div></WorkspacePanel>}
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

function Warning({ title, body, href }: { title: string; body: string; href: string }) {
  return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><h2 className="font-semibold text-amber-950">{title}</h2><p className="mt-1 text-sm text-amber-800">{body}</p><Link className="mt-3 inline-flex rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white" href={href}>Open</Link></div>;
}

function EmptyStudio() {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-semibold">Create your first Business Profile</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">SettleSmart Studio needs one editable business profile before Brand Kit, campaigns and media intelligence can begin.</p><Link href="/studio?section=brand" className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Create Business Profile</Link></div>;
}

function MediaGrid({ media }: { media: Awaited<ReturnType<typeof getWorkspaceData>>["mediaAssets"] }) {
  if (media.length === 0) return <p className="text-sm text-slate-500">No media yet.</p>;
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{media.map((asset) => <article key={asset.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="font-semibold">{asset.title}</div><p className="mt-1 text-xs text-slate-500">{asset.assetType} · {asset.sourceType} · {asset.approvalStatus} · {asset.usageType}</p>{asset.mimeType.startsWith("image/") && <AssetImage src={asset.filePath} alt={asset.title} className="mt-3 aspect-video w-full rounded-md object-cover" />}{asset.mimeType.startsWith("video/") && <video src={normalizePublicAssetPath(asset.filePath)} controls className="mt-3 aspect-video w-full rounded-md" />}<div className="mt-3 flex flex-wrap gap-2 text-xs"><a href={normalizePublicAssetPath(asset.filePath)} download className="rounded bg-slate-100 px-2 py-1">Download</a><span className="rounded bg-slate-100 px-2 py-1">Duplicate</span><span className="rounded bg-slate-100 px-2 py-1">Placements {asset.placements?.length ?? 0}</span></div><MediaApprovalActions assetId={asset.id} /></article>)}</div>;
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
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{rows.map(([category, type, size]) => <Card key={`${category}-${type}`} title={String(category)}><p className="text-sm font-semibold">{type}</p><p className="mt-1 text-sm text-slate-500">{size}</p><p className="mt-3 text-xs text-slate-500">Brand-compatible · Active</p></Card>)}</div>;
}
