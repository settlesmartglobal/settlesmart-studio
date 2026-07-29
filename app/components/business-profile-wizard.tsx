"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Building2, Camera, CheckCircle2, Globe2, MessageCircle, Palette, Sparkles, Upload, WandSparkles } from "lucide-react";

type Company = {
  id?: string;
  name?: string;
  slug?: string;
  businessType?: string;
  industry?: string | null;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  productsSummary?: string | null;
  brandPersonality?: string | null;
  preferredLanguage?: string | null;
  brandProfile?: BrandProfile | null;
};

type BrandProfile = {
  tagline?: string | null;
  logoPath?: string | null;
  secondaryLogoPath?: string | null;
  lightLogoPath?: string | null;
  darkLogoPath?: string | null;
  faviconPath?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  headingFont?: string | null;
  bodyFont?: string | null;
  brandTone?: string | null;
  visualStyle?: string | null;
  preferredImageStyle?: string | null;
  preferredVideoStyle?: string | null;
  defaultCallToAction?: string | null;
  ctaStyle?: string | null;
  instagramHandle?: string | null;
  facebookPage?: string | null;
  linkedinPage?: string | null;
  whatsappNumber?: string | null;
};

const steps = ["Business", "Identity", "Colours", "Social", "AI", "Review", "Finish"];

async function submitJson(url: string, body: Record<string, unknown>, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Unable to save");
  return json;
}

export function BusinessProfileWizard({ company }: { company?: Company }) {
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const brand = company?.brandProfile;
  const palette = {
    primary: brand?.primaryColor ?? "#2563eb",
    secondary: brand?.secondaryColor ?? "#14b8a6",
    accent: brand?.accentColor ?? "#f97316",
    background: brand?.backgroundColor ?? "#ffffff",
    text: brand?.textColor ?? "#111827",
  };
  const percent = useMemo(() => {
    const values = [company?.name, company?.industry, company?.description, company?.targetAudience, brand?.tagline, brand?.brandTone, brand?.visualStyle, brand?.defaultCallToAction, brand?.primaryColor, brand?.logoPath];
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [company, brand]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {steps.map((label, index) => (
            <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-md px-3 py-2 text-xs font-semibold ${step === index ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {index + 1}. {label}
            </button>
          ))}
        </div>
        <div className="mt-5 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-600" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>

        <form className="mt-6" onSubmit={async (event) => {
          event.preventDefault();
          const form = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const savedCompany = await submitJson(company?.id ? `/api/company/${company.id}` : "/api/company", {
              name: form.name,
              slug: form.slug,
              businessType: form.businessType,
              industry: form.industry,
              country: form.country,
              city: form.city,
              website: form.website,
              email: form.email,
              phone: form.phone,
              whatsapp: form.whatsapp,
              description: form.description,
              targetAudience: form.targetAudience,
              productsSummary: form.productsSummary,
              brandPersonality: form.brandPersonality,
              preferredLanguage: form.preferredLanguage,
              studioEnabled: true,
            }, company?.id ? "PUT" : "POST");
            await submitJson("/api/brand-kit", {
              companyId: company?.id ?? savedCompany.id,
              tagline: form.tagline,
              logoPath: form.logoPath,
              secondaryLogoPath: form.secondaryLogoPath,
              lightLogoPath: form.lightLogoPath,
              darkLogoPath: form.darkLogoPath,
              faviconPath: form.faviconPath,
              primaryColor: form.primaryColor,
              secondaryColor: form.secondaryColor,
              accentColor: form.accentColor,
              backgroundColor: form.backgroundColor,
              textColor: form.textColor,
              headingFont: form.headingFont,
              bodyFont: form.bodyFont,
              brandTone: form.brandTone,
              visualStyle: form.visualStyle,
              preferredImageStyle: form.preferredImageStyle,
              preferredVideoStyle: form.preferredVideoStyle,
              defaultCallToAction: form.defaultCallToAction,
              ctaStyle: form.ctaStyle,
              instagramHandle: form.instagramHandle,
              facebookPage: form.facebookPage,
              linkedinPage: form.linkedinPage,
              whatsappNumber: form.whatsappNumber,
              approvalStatus: "APPROVED",
            });
            setMessage("Business Profile saved and Brand Kit marked ready.");
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
            setMessage("");
          }
        }}>
          <HiddenDefaults company={company} brand={brand} palette={palette} />
          {step === 0 && <StepCard icon={<Building2 size={20} />} title="Business Information" intro="Tell Studio what SettleSmart Works is and who it serves."><Field label="Business name" name="name" value={company?.name ?? "SettleSmart Works"} /><Field label="Workspace URL name" name="slug" value={company?.slug ?? "settlesmart-works"} /><Select label="Business category" name="businessType" value={company?.businessType ?? "SERVICE_BUSINESS"} options={["SERVICE_BUSINESS", "EDUCATION", "RECRUITMENT_AGENCY", "HR_CONSULTANCY", "RETAIL", "OTHER"]} /><Field label="Industry" name="industry" value={company?.industry ?? "AI-powered business, career and brand operations software"} /><Field label="Country" name="country" value={company?.country ?? "India"} /><Field label="City" name="city" value={company?.city ?? "Bengaluru"} /><TextArea label="What the business does" name="description" value={company?.description ?? ""} /></StepCard>}
          {step === 1 && <StepCard icon={<Upload size={20} />} title="Brand Identity" intro="Add logo assets when they are ready. Placeholder records can stay until final files are uploaded."><Field label="Tagline" name="tagline" value={brand?.tagline ?? "Empowering People. Transforming Businesses."} /><LogoField label="Primary Logo" name="logoPath" value={brand?.logoPath ?? ""} tone="light" /><LogoField label="Secondary Logo" name="secondaryLogoPath" value={brand?.secondaryLogoPath ?? ""} tone="light" /><LogoField label="Light Logo" name="lightLogoPath" value={brand?.lightLogoPath ?? ""} tone="light" /><LogoField label="Dark Logo" name="darkLogoPath" value={brand?.darkLogoPath ?? ""} tone="dark" /><LogoField label="Favicon" name="faviconPath" value={brand?.faviconPath ?? ""} tone="light" /></StepCard>}
          {step === 2 && <StepCard icon={<Palette size={20} />} title="Brand Colours" intro="Build the working palette Studio uses for previews and generated creative."><ColorField label="Primary brand colour" name="primaryColor" value={palette.primary} /><ColorField label="Secondary brand colour" name="secondaryColor" value={palette.secondary} /><ColorField label="Accent colour" name="accentColor" value={palette.accent} /><ColorField label="Canvas background" name="backgroundColor" value={palette.background} /><ColorField label="Text colour" name="textColor" value={palette.text} /></StepCard>}
          {step === 3 && <StepCard icon={<Globe2 size={20} />} title="Social Channels" intro="Connect the channels Studio should prepare content for."><SocialField icon={<Camera size={18} />} label="Instagram" name="instagramHandle" value={brand?.instagramHandle ?? ""} /><SocialField icon={<MessageCircle size={18} />} label="Facebook" name="facebookPage" value={brand?.facebookPage ?? ""} /><SocialField icon={<BriefcaseBusiness size={18} />} label="LinkedIn" name="linkedinPage" value={brand?.linkedinPage ?? ""} /><SocialField icon={<Globe2 size={18} />} label="WhatsApp" name="whatsappNumber" value={brand?.whatsappNumber ?? company?.whatsapp ?? ""} /><Field label="Website" name="website" value={company?.website ?? "https://settlesmart.works"} /><Field label="Email" name="email" value={company?.email ?? "hello@settlesmart.works"} /><Field label="Phone" name="phone" value={company?.phone ?? ""} /><Field label="WhatsApp" name="whatsapp" value={company?.whatsapp ?? ""} /></StepCard>}
          {step === 4 && <StepCard icon={<WandSparkles size={20} />} title="AI Preferences" intro="Choose the creative direction Studio should follow."><Choice label="Visual Style" name="visualStyle" value={brand?.visualStyle ?? "Modern SaaS, clean editorial layouts, premium but practical."} options={["Corporate", "Minimal", "Luxury", "Modern", "Recruitment", "Education"]} /><Choice label="Brand Voice" name="brandTone" value={brand?.brandTone ?? "Professional, warm, direct and empowering."} options={["Professional", "Warm", "Direct", "Premium", "Practical"]} /><Field label="Photography style" name="preferredImageStyle" value={brand?.preferredImageStyle ?? "Bright workspace imagery, crisp product UI previews and confident founder-led visuals."} /><Field label="Video style" name="preferredVideoStyle" value={brand?.preferredVideoStyle ?? "Short, clear product-led explainers with calm motion and strong captions."} /><Field label="Call-to-action style" name="ctaStyle" value={brand?.ctaStyle ?? "Clear action buttons with concise value-led copy."} /><Field label="Default CTA" name="defaultCallToAction" value={brand?.defaultCallToAction ?? "Start with SettleSmart Studio"} /><TextArea label="Target audience" name="targetAudience" value={company?.targetAudience ?? ""} /><TextArea label="Products and services" name="productsSummary" value={company?.productsSummary ?? ""} /><Field label="Brand personality" name="brandPersonality" value={company?.brandPersonality ?? ""} /><Field label="Preferred language" name="preferredLanguage" value={company?.preferredLanguage ?? "English"} /></StepCard>}
          {step === 5 && <ReviewCard company={company} percent={percent} palette={palette} />}
          {step === 6 && <StepCard icon={<CheckCircle2 size={20} />} title="Finish" intro="Save the profile and mark the Brand Kit ready for Studio generation."><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">SettleSmart Works will become the editable starter business profile for this Studio workspace.</div></StepCard>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setStep(Math.max(0, step - 1))} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Back</button>
            <div className="flex gap-3"><button type="button" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Next</button><button className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Save</button></div>
          </div>
          {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>
      </section>
      <LivePreview company={company} palette={palette} percent={percent} />
    </div>
  );
}

function StepCard({ icon, title, intro, children }: { icon: React.ReactNode; title: string; intro: string; children: React.ReactNode }) {
  return <div><div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-700">{icon}</div><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{intro}</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div></div>;
}

function HiddenDefaults({ company, brand, palette }: { company?: Company; brand?: BrandProfile | null; palette: Record<string, string> }) {
  const defaults: Record<string, string> = {
    name: company?.name ?? "SettleSmart Works",
    slug: company?.slug ?? "settlesmart-works",
    businessType: company?.businessType ?? "SERVICE_BUSINESS",
    industry: company?.industry ?? "AI-powered business, career and brand operations software",
    country: company?.country ?? "India",
    city: company?.city ?? "Bengaluru",
    website: company?.website ?? "https://settlesmart.works",
    email: company?.email ?? "hello@settlesmart.works",
    phone: company?.phone ?? "",
    whatsapp: company?.whatsapp ?? "",
    description: company?.description ?? "",
    targetAudience: company?.targetAudience ?? "",
    productsSummary: company?.productsSummary ?? "",
    brandPersonality: company?.brandPersonality ?? "",
    preferredLanguage: company?.preferredLanguage ?? "English",
    tagline: brand?.tagline ?? "Empowering People. Transforming Businesses.",
    logoPath: brand?.logoPath ?? "",
    secondaryLogoPath: brand?.secondaryLogoPath ?? "",
    lightLogoPath: brand?.lightLogoPath ?? "",
    darkLogoPath: brand?.darkLogoPath ?? "",
    faviconPath: brand?.faviconPath ?? "",
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    backgroundColor: palette.background,
    textColor: palette.text,
    headingFont: brand?.headingFont ?? "Inter",
    bodyFont: brand?.bodyFont ?? "Inter",
    brandTone: brand?.brandTone ?? "Professional, warm, direct and empowering.",
    visualStyle: brand?.visualStyle ?? "Modern SaaS, clean editorial layouts, premium but practical.",
    preferredImageStyle: brand?.preferredImageStyle ?? "Bright workspace imagery, crisp product UI previews and confident founder-led visuals.",
    preferredVideoStyle: brand?.preferredVideoStyle ?? "Short, clear product-led explainers with calm motion and strong captions.",
    defaultCallToAction: brand?.defaultCallToAction ?? "Start with SettleSmart Studio",
    ctaStyle: brand?.ctaStyle ?? "Clear action buttons with concise value-led copy.",
    instagramHandle: brand?.instagramHandle ?? "",
    facebookPage: brand?.facebookPage ?? "",
    linkedinPage: brand?.linkedinPage ?? "",
    whatsappNumber: brand?.whatsappNumber ?? company?.whatsapp ?? "",
  };
  return <>{Object.entries(defaults).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} readOnly />)}</>;
}

function Field({ label, name, value }: { label: string; name: string; value: string }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700">{label}<input name={name} defaultValue={value} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-400" /></label>;
}

function TextArea({ label, name, value }: { label: string; name: string; value: string }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">{label}<textarea name={name} defaultValue={value} className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-400" /></label>;
}

function Select({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700">{label}<select name={name} defaultValue={value} className="rounded-lg border border-slate-200 bg-white px-3 py-2">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function ColorField({ label, name, value }: { label: string; name: string; value: string }) {
  const rgb = hexToRgb(value);
  return <label className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium"><span>{label}</span><div className="flex items-center gap-3"><input type="color" name={name} defaultValue={value} className="size-12 rounded border border-slate-200" /><span className="font-mono text-xs">{value}</span><span className="text-xs text-slate-500">{rgb}</span></div></label>;
}

function LogoField({ label, name, value, tone }: { label: string; name: string; value: string; tone: "light" | "dark" }) {
  return <label className="grid gap-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm font-medium"><span>{label}</span><div className={`grid h-24 place-items-center rounded-lg ${tone === "dark" ? "bg-slate-950 text-white" : "bg-white text-slate-500"} border border-slate-200`}>{value ? <img src={value} alt="" className="max-h-16 max-w-40" /> : <span>Upload required</span>}</div><input name={name} defaultValue={value} placeholder="Paste uploaded asset URL after upload" className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><div className="flex gap-2 text-xs text-slate-500"><span>PNG</span><span>SVG</span><span>WEBP</span></div></label>;
}

function SocialField({ icon, label, name, value }: { icon: React.ReactNode; label: string; name: string; value: string }) {
  return <label className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium"><span className="flex items-center gap-2">{icon}{label}</span><input name={name} defaultValue={value} placeholder={`${label} handle or URL`} className="rounded-md border border-slate-200 px-3 py-2" /></label>;
}

function Choice({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<select name={name} defaultValue={value} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><option>{value}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function ReviewCard({ company, percent, palette }: { company?: Company; percent: number; palette: Record<string, string> }) {
  return <StepCard icon={<Sparkles size={20} />} title="Review" intro="A final check before Studio uses this profile for content generation."><div className="md:col-span-2 rounded-lg border border-slate-200 p-4"><p className="text-3xl font-semibold">{percent}% Complete</p><p className="mt-2 text-sm text-slate-500">{company?.name ?? "SettleSmart Works"} · {company?.brandProfile?.tagline ?? "Empowering People. Transforming Businesses."}</p><div className="mt-4 flex gap-2">{Object.values(palette).map((color) => <span key={color} className="size-8 rounded-full border border-slate-200" style={{ background: color }} />)}</div></div></StepCard>;
}

function LivePreview({ company, palette, percent }: { company?: Company; palette: Record<string, string>; percent: number }) {
  const tagline = company?.brandProfile?.tagline ?? "Empowering People. Transforming Businesses.";
  return <aside className="space-y-4"><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">Live Brand Preview</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{percent}% Complete</span></div><div className="mt-4 rounded-lg p-5" style={{ background: palette.background, color: palette.text }}><div className="text-sm font-semibold" style={{ color: palette.primary }}>{company?.name ?? "SettleSmart Works"}</div><h3 className="mt-3 text-2xl font-semibold">AI-Powered Marketing & Brand Operations Platform</h3><p className="mt-2 text-sm opacity-80">{tagline}</p><button type="button" className="mt-5 rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ background: palette.accent }}>{company?.brandProfile?.defaultCallToAction ?? "Start with Studio"}</button></div></section><PreviewTile title="Business Card" body={tagline} palette={palette} /><PreviewTile title="Instagram Post" body="Create once. Approve once. Use everywhere." palette={palette} /><PreviewTile title="LinkedIn Banner" body="Professional content systems for growing businesses." palette={palette} /><PreviewTile title="Website Hero" body="SettleSmart Works product family." palette={palette} /></aside>;
}

function PreviewTile({ title, body, palette }: { title: string; body: string; palette: Record<string, string> }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="rounded-lg p-4" style={{ background: palette.primary, color: "#fff" }}><p className="text-xs font-semibold uppercase opacity-80">{title}</p><p className="mt-3 text-lg font-semibold">{body}</p></div></section>;
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  return `rgb(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255})`;
}
