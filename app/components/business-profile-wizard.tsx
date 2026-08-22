"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Building2, Camera, CheckCircle2, Globe2, MessageCircle, Palette, Sparkles, Upload, WandSparkles } from "lucide-react";
import { AssetImage } from "./asset-image";

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

export type BusinessDraft = {
  name: string;
  slug: string;
  businessType: string;
  industry: string;
  country: string;
  city: string;
  website: string;
  email: string;
  phone: string;
  whatsapp: string;
  description: string;
  targetAudience: string;
  productsSummary: string;
  brandPersonality: string;
  preferredLanguage: string;
  tagline: string;
  logoPath: string;
  secondaryLogoPath: string;
  lightLogoPath: string;
  darkLogoPath: string;
  faviconPath: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  brandTone: string;
  visualStyle: string;
  preferredImageStyle: string;
  preferredVideoStyle: string;
  defaultCallToAction: string;
  ctaStyle: string;
  instagramHandle: string;
  facebookPage: string;
  linkedinPage: string;
  whatsappNumber: string;
};

type ExistingBusiness = { id: string; name: string; slug: string };

const steps = ["Business", "Identity", "Colours", "Social", "AI", "Review", "Finish"];
const draftStoragePrefix = "studio-business-draft";

const blankDraft: BusinessDraft = {
  name: "",
  slug: "",
  businessType: "SERVICE_BUSINESS",
  industry: "",
  country: "",
  city: "",
  website: "",
  email: "",
  phone: "",
  whatsapp: "",
  description: "",
  targetAudience: "",
  productsSummary: "",
  brandPersonality: "",
  preferredLanguage: "",
  tagline: "",
  logoPath: "",
  secondaryLogoPath: "",
  lightLogoPath: "",
  darkLogoPath: "",
  faviconPath: "",
  primaryColor: "#2563eb",
  secondaryColor: "#14b8a6",
  accentColor: "#14b8a6",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  headingFont: "Inter",
  bodyFont: "Inter",
  brandTone: "",
  visualStyle: "",
  preferredImageStyle: "",
  preferredVideoStyle: "",
  defaultCallToAction: "",
  ctaStyle: "",
  instagramHandle: "",
  facebookPage: "",
  linkedinPage: "",
  whatsappNumber: "",
};

async function submitJson(url: string, body: Record<string, unknown>, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? json.errors?.formErrors?.[0] ?? "Unable to save");
  return json;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function clean(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function draftFromCompany(company?: Company): BusinessDraft {
  const brand = company?.brandProfile;
  return {
    ...blankDraft,
    name: clean(company?.name),
    slug: clean(company?.slug),
    businessType: clean(company?.businessType) || "SERVICE_BUSINESS",
    industry: clean(company?.industry),
    country: clean(company?.country),
    city: clean(company?.city),
    website: clean(company?.website),
    email: clean(company?.email),
    phone: clean(company?.phone),
    whatsapp: clean(company?.whatsapp),
    description: clean(company?.description),
    targetAudience: clean(company?.targetAudience),
    productsSummary: clean(company?.productsSummary),
    brandPersonality: clean(company?.brandPersonality),
    preferredLanguage: clean(company?.preferredLanguage),
    tagline: clean(brand?.tagline),
    logoPath: clean(brand?.logoPath),
    secondaryLogoPath: clean(brand?.secondaryLogoPath),
    lightLogoPath: clean(brand?.lightLogoPath),
    darkLogoPath: clean(brand?.darkLogoPath),
    faviconPath: clean(brand?.faviconPath),
    primaryColor: clean(brand?.primaryColor) || blankDraft.primaryColor,
    secondaryColor: clean(brand?.secondaryColor) || blankDraft.secondaryColor,
    accentColor: clean(brand?.accentColor) || blankDraft.accentColor,
    backgroundColor: clean(brand?.backgroundColor) || blankDraft.backgroundColor,
    textColor: clean(brand?.textColor) || blankDraft.textColor,
    headingFont: clean(brand?.headingFont) || "Inter",
    bodyFont: clean(brand?.bodyFont) || "Inter",
    brandTone: clean(brand?.brandTone),
    visualStyle: clean(brand?.visualStyle),
    preferredImageStyle: clean(brand?.preferredImageStyle),
    preferredVideoStyle: clean(brand?.preferredVideoStyle),
    defaultCallToAction: clean(brand?.defaultCallToAction),
    ctaStyle: clean(brand?.ctaStyle),
    instagramHandle: clean(brand?.instagramHandle),
    facebookPage: clean(brand?.facebookPage),
    linkedinPage: clean(brand?.linkedinPage),
    whatsappNumber: clean(brand?.whatsappNumber) || clean(company?.whatsapp),
  };
}

function storageKey(mode: "create" | "edit", companyId?: string) {
  return `${draftStoragePrefix}:${mode}:${companyId ?? "new"}`;
}

function loadStoredDraft(key: string, fallback: BusinessDraft) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.sessionStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

function persistDraft(key: string, draft: BusinessDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(draft));
}

function clearDraft(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}

const completionFields: Array<keyof BusinessDraft> = [
  "name",
  "slug",
  "businessType",
  "industry",
  "country",
  "city",
  "description",
  "primaryColor",
  "secondaryColor",
  "backgroundColor",
  "textColor",
  "preferredLanguage",
  "tagline",
  "brandTone",
  "visualStyle",
  "defaultCallToAction",
  "targetAudience",
  "brandPersonality",
];

export function completionPercent(draft: BusinessDraft) {
  return Math.round((completionFields.filter((field) => Boolean(draft[field]?.trim())).length / completionFields.length) * 100);
}

const stepRequiredFields: Record<number, Array<keyof BusinessDraft>> = {
  0: ["name", "slug", "businessType", "industry", "country", "city", "description"],
  1: ["tagline"],
  2: ["primaryColor", "secondaryColor", "backgroundColor", "textColor"],
  3: [],
  4: ["brandTone", "visualStyle", "preferredLanguage"],
  5: [],
  6: ["name", "slug", "businessType", "industry", "country", "city", "description", "primaryColor", "preferredLanguage"],
};

const fieldLabels: Partial<Record<keyof BusinessDraft, string>> = {
  name: "Business Name",
  slug: "Workspace URL",
  businessType: "Business Category",
  industry: "Industry",
  country: "Country",
  city: "City",
  description: "Business Description",
  primaryColor: "Primary Brand Colour",
  secondaryColor: "Secondary Brand Colour",
  backgroundColor: "Canvas Background",
  textColor: "Text Colour",
  preferredLanguage: "Preferred Language",
  tagline: "Tagline",
  brandTone: "Brand Voice",
  visualStyle: "Visual Style",
};

export function missingFields(draft: BusinessDraft, step: number) {
  return (stepRequiredFields[step] ?? []).filter((field) => !draft[field]?.trim());
}

function missingMessage(fields: Array<keyof BusinessDraft>) {
  if (!fields.length) return "";
  const labels = fields.map((field) => fieldLabels[field] ?? field);
  return `Complete ${labels.join(", ")} before continuing.`;
}

export function BusinessProfileWizard({ company }: { company?: Company }) {
  return <BusinessProfileWizardInner company={company} mode={company?.id ? "edit" : "create"} />;
}

export function BusinessProfileWizardInner({ company, companyId, mode = "edit", existingBusinesses = [] }: { company?: Company; companyId?: string; mode?: "create" | "edit"; existingSlugs?: string[]; existingBusinesses?: ExistingBusiness[] }) {
  const router = useRouter();
  const isCreate = mode === "create";
  const key = storageKey(mode, company?.id);
  const initialDraft = isCreate ? blankDraft : draftFromCompany(company);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BusinessDraft>(() => loadStoredDraft(key, initialDraft));
  const [slugEdited, setSlugEdited] = useState(Boolean(company?.slug));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    persistDraft(key, draft);
  }, [key, draft]);

  const duplicateBusiness = existingBusinesses.find((item) => item.slug === draft.slug && item.id !== company?.id);
  const duplicateSlug = Boolean(duplicateBusiness);
  const palette = {
    primary: draft.primaryColor,
    secondary: draft.secondaryColor,
    accent: draft.accentColor,
    background: draft.backgroundColor,
    text: draft.textColor,
  };
  const percent = completionPercent(draft);
  const finalMissing = missingFields(draft, 6);
  const disableCreate = isCreate && (duplicateSlug || finalMissing.length > 0);
  const disabledReason = duplicateSlug ? `A business with workspace URL ${draft.slug} already exists. Open existing business instead.` : missingMessage(finalMissing);

  function update(field: keyof BusinessDraft, value: string) {
    setSaveState("idle");
    setDraft((current) => ({ ...current, [field]: field === "slug" ? slugify(value) : value }));
  }

  function updateName(value: string) {
    setSaveState("idle");
    setDraft((current) => ({ ...current, name: value, slug: slugEdited ? current.slug : slugify(value) }));
  }

  function goNext() {
    const missing = missingFields(draft, step);
    if (missing.length) {
      setError(missingMessage(missing));
      return;
    }
    setError("");
    setStep(Math.min(steps.length - 1, step + 1));
  }

  async function save() {
    if (saveState === "saving") return;
    try {
      setSaveState("saving");
      setMessage("");
      setError("");
      if (duplicateSlug) throw new Error(disabledReason);
      const missing = isCreate || step === steps.length - 1 ? finalMissing : missingFields(draft, step);
      if (missing.length) throw new Error(missingMessage(missing));
      const savedCompany = await submitJson(!isCreate && company?.id ? `/api/company/${company.id}` : "/api/company", {
        name: draft.name,
        slug: draft.slug,
        businessType: draft.businessType,
        industry: draft.industry,
        country: draft.country,
        city: draft.city,
        website: draft.website,
        email: draft.email,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        description: draft.description,
        targetAudience: draft.targetAudience,
        productsSummary: draft.productsSummary,
        brandPersonality: draft.brandPersonality,
        preferredLanguage: draft.preferredLanguage,
        studioEnabled: true,
      }, !isCreate && company?.id ? "PUT" : "POST");
      await submitJson("/api/brand-kit", {
        companyId: !isCreate && company?.id ? company.id : savedCompany.id,
        tagline: draft.tagline,
        logoPath: draft.logoPath,
        secondaryLogoPath: draft.secondaryLogoPath,
        lightLogoPath: draft.lightLogoPath,
        darkLogoPath: draft.darkLogoPath,
        faviconPath: draft.faviconPath,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        accentColor: draft.accentColor,
        backgroundColor: draft.backgroundColor,
        textColor: draft.textColor,
        headingFont: draft.headingFont,
        bodyFont: draft.bodyFont,
        brandTone: draft.brandTone,
        visualStyle: draft.visualStyle,
        preferredImageStyle: draft.preferredImageStyle,
        preferredVideoStyle: draft.preferredVideoStyle,
        defaultCallToAction: draft.defaultCallToAction,
        ctaStyle: draft.ctaStyle,
        instagramHandle: draft.instagramHandle,
        facebookPage: draft.facebookPage,
        linkedinPage: draft.linkedinPage,
        whatsappNumber: draft.whatsappNumber,
        approvalStatus: "APPROVED",
      });
      clearDraft(key);
      setSaveState("saved");
      setMessage(isCreate ? "Business created and Brand Kit is ready." : "Business Profile saved and Brand Kit is ready.");
      setError("");
      router.refresh();
      window.setTimeout(() => {
        const targetCompany = savedCompany.slug ?? savedCompany.id ?? draft.slug;
        router.push(`/studio?company=${encodeURIComponent(targetCompany)}&section=overview`);
      }, 700);
    } catch (err) {
      setSaveState("idle");
      setError(err instanceof Error ? err.message : "Save failed");
      setMessage("");
    }
  }

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

        <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          {step === 0 && <StepCard icon={<Building2 size={20} />} title="Business Information" intro={isCreate ? "Create a new isolated Studio business profile." : "Edit the selected Studio business profile."}><Field label="Business name" name="name" value={draft.name} onChange={updateName} required /><Field label="Workspace URL name" name="slug" value={draft.slug} onChange={(value) => { setSlugEdited(true); update("slug", value); }} required />{duplicateSlug && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 md:col-span-2">{disabledReason}{duplicateBusiness && <a className="ml-2 text-sky-700 underline" href={`/studio?company=${duplicateBusiness.id}&section=brand`}>Open {duplicateBusiness.name}</a>}</div>}<Select label="Business category" name="businessType" value={draft.businessType} onChange={(value) => update("businessType", value)} options={["SERVICE_BUSINESS", "EDUCATION", "RECRUITMENT_AGENCY", "HR_CONSULTANCY", "RETAIL", "OTHER"]} /><Field label="Industry" name="industry" value={draft.industry} onChange={(value) => update("industry", value)} /><Field label="Country" name="country" value={draft.country} onChange={(value) => update("country", value)} /><Field label="City" name="city" value={draft.city} onChange={(value) => update("city", value)} /><TextArea label="What the business does" name="description" value={draft.description} onChange={(value) => update("description", value)} /></StepCard>}
          {step === 1 && <StepCard icon={<Upload size={20} />} title="Brand Identity" intro="Upload logo files from your device. External URLs remain available as a secondary option."><Field label="Tagline" name="tagline" value={draft.tagline} onChange={(value) => update("tagline", value)} /><BrandAssetUpload label="Primary Logo" field="logoPath" value={draft.logoPath} companyId={companyId} onChange={(value) => update("logoPath", value)} tone="light" /><BrandAssetUpload label="Secondary Logo" field="secondaryLogoPath" value={draft.secondaryLogoPath} companyId={companyId} onChange={(value) => update("secondaryLogoPath", value)} tone="light" /><BrandAssetUpload label="Light Logo" field="lightLogoPath" value={draft.lightLogoPath} companyId={companyId} onChange={(value) => update("lightLogoPath", value)} tone="light" /><BrandAssetUpload label="Dark Logo" field="darkLogoPath" value={draft.darkLogoPath} companyId={companyId} onChange={(value) => update("darkLogoPath", value)} tone="dark" /><BrandAssetUpload label="Favicon" field="faviconPath" value={draft.faviconPath} companyId={companyId} onChange={(value) => update("faviconPath", value)} tone="light" favicon /></StepCard>}
          {step === 2 && <StepCard icon={<Palette size={20} />} title="Brand Colours" intro="Build the working palette Studio uses for previews and generated creative."><ColorField label="Primary brand colour" name="primaryColor" value={draft.primaryColor} onChange={(value) => update("primaryColor", value)} /><ColorField label="Secondary brand colour" name="secondaryColor" value={draft.secondaryColor} onChange={(value) => update("secondaryColor", value)} /><ColorField label="Accent colour" name="accentColor" value={draft.accentColor} onChange={(value) => update("accentColor", value)} /><ColorField label="Canvas background" name="backgroundColor" value={draft.backgroundColor} onChange={(value) => update("backgroundColor", value)} /><ColorField label="Text colour" name="textColor" value={draft.textColor} onChange={(value) => update("textColor", value)} /></StepCard>}
          {step === 3 && <StepCard icon={<Globe2 size={20} />} title="Social Channels" intro="Connect the channels Studio should prepare content for."><SocialField icon={<Camera size={18} />} label="Instagram" name="instagramHandle" value={draft.instagramHandle} onChange={(value) => update("instagramHandle", value)} /><SocialField icon={<MessageCircle size={18} />} label="Facebook" name="facebookPage" value={draft.facebookPage} onChange={(value) => update("facebookPage", value)} /><SocialField icon={<BriefcaseBusiness size={18} />} label="LinkedIn" name="linkedinPage" value={draft.linkedinPage} onChange={(value) => update("linkedinPage", value)} /><SocialField icon={<Globe2 size={18} />} label="WhatsApp" name="whatsappNumber" value={draft.whatsappNumber} onChange={(value) => update("whatsappNumber", value)} /><Field label="Website" name="website" value={draft.website} onChange={(value) => update("website", value)} /><Field label="Email" name="email" value={draft.email} onChange={(value) => update("email", value)} /><Field label="Phone" name="phone" value={draft.phone} onChange={(value) => update("phone", value)} /><Field label="WhatsApp" name="whatsapp" value={draft.whatsapp} onChange={(value) => update("whatsapp", value)} /></StepCard>}
          {step === 4 && <StepCard icon={<WandSparkles size={20} />} title="AI Preferences" intro="Choose the creative direction Studio should follow."><Choice label="Visual Style" name="visualStyle" value={draft.visualStyle} onChange={(value) => update("visualStyle", value)} options={["Corporate", "Minimal", "Luxury", "Modern", "Recruitment", "Education", "Premium, clean, modern, light, minimal and professional."]} /><Choice label="Brand Voice" name="brandTone" value={draft.brandTone} onChange={(value) => update("brandTone", value)} options={["Professional", "Warm", "Direct", "Premium", "Practical", "Professional, human-centred, intelligent, global, trustworthy, impact-driven."]} /><Field label="Photography style" name="preferredImageStyle" value={draft.preferredImageStyle} onChange={(value) => update("preferredImageStyle", value)} /><Field label="Video style" name="preferredVideoStyle" value={draft.preferredVideoStyle} onChange={(value) => update("preferredVideoStyle", value)} /><Field label="Call-to-action style" name="ctaStyle" value={draft.ctaStyle} onChange={(value) => update("ctaStyle", value)} /><Field label="Default CTA" name="defaultCallToAction" value={draft.defaultCallToAction} onChange={(value) => update("defaultCallToAction", value)} /><TextArea label="Target audience" name="targetAudience" value={draft.targetAudience} onChange={(value) => update("targetAudience", value)} /><TextArea label="Products and services" name="productsSummary" value={draft.productsSummary} onChange={(value) => update("productsSummary", value)} /><Field label="Brand personality" name="brandPersonality" value={draft.brandPersonality} onChange={(value) => update("brandPersonality", value)} /><Field label="Preferred language" name="preferredLanguage" value={draft.preferredLanguage} onChange={(value) => update("preferredLanguage", value)} /></StepCard>}
          {step === 5 && <ReviewCard draft={draft} percent={percent} palette={palette} />}
          {step === 6 && <StepCard icon={<CheckCircle2 size={20} />} title="Finish" intro="Save the profile and mark the Brand Kit ready for Studio generation."><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{isCreate ? "This will create a new isolated Studio business and make it active." : "This will update the selected Studio business profile."}</div>{disabledReason && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 md:col-span-2">{disabledReason}{duplicateBusiness && <a className="ml-2 text-sky-700 underline" href={`/studio?company=${duplicateBusiness.id}&section=brand`}>Open {duplicateBusiness.name}</a>}</div>}</StepCard>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" disabled={saveState === "saving"} onClick={() => setStep(Math.max(0, step - 1))} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">Back</button>
            <div className="flex gap-3">{step < steps.length - 1 && <button type="button" onClick={goNext} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Next</button>}<button disabled={disableCreate || saveState === "saving"} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : isCreate ? "Create Business" : "Save & Finish"}</button></div>
          </div>
          {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>
      </section>
      <LivePreview draft={draft} palette={palette} percent={percent} />
    </div>
  );
}

function StepCard({ icon, title, intro, children }: { icon: React.ReactNode; title: string; intro: string; children: React.ReactNode }) {
  return <div><div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-700">{icon}</div><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{intro}</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div></div>;
}

function Field({ label, name, value, onChange, required = false }: { label: string; name: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700">{label}<input name={name} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-400" /></label>;
}

function TextArea({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">{label}<textarea name={name} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-400" /></label>;
}

function Select({ label, name, value, options, onChange }: { label: string; name: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700">{label}<select name={name} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ColorField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  const rgb = hexToRgb(value);
  return <label className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium"><span>{label}</span><div className="flex items-center gap-3"><input type="color" name={name} value={value} onChange={(event) => onChange(event.target.value)} className="size-12 rounded border border-slate-200" /><span className="font-mono text-xs">{value}</span><span className="text-xs text-slate-500">{rgb}</span></div></label>;
}

function isSafeExternalAssetUrl(value: string) {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return value.startsWith("/");
  }
}

function BrandAssetUpload({ label, field, value, onChange, companyId, tone, favicon = false }: { label: string; field: keyof BusinessDraft; value: string; onChange: (value: string) => void; companyId?: string; tone: "light" | "dark"; favicon?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [showExternal, setShowExternal] = useState(false);
  const accept = favicon ? "image/png,image/svg+xml,image/x-icon,.ico" : "image/png,image/svg+xml,image/webp";
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("target", "brand");
    form.append("brandField", field);
    if (companyId) form.append("companyId", companyId);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Upload failed");
      onChange(String(json.filePath ?? ""));
      setFilename(String(json.originalFilename ?? file.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  function applyExternal(next: string) {
    if (!isSafeExternalAssetUrl(next)) {
      setError("Use a valid http(s) URL or a public site path.");
      return;
    }
    setError("");
    onChange(next);
  }
  return <div className="grid gap-3 rounded-lg border border-slate-200 p-4 text-sm font-medium"><div className="flex items-center justify-between gap-3"><span>{label}</span>{value && <button type="button" onClick={() => { onChange(""); setFilename(""); }} className="text-xs font-semibold text-red-600">Remove</button>}</div><label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }} className={`grid h-28 cursor-pointer place-items-center rounded-lg border border-dashed ${tone === "dark" ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-500"}`}>{value ? <AssetImage src={value} alt={label} className="max-h-20 max-w-48 object-contain" /> : <span>{uploading ? "Uploading..." : `Upload ${favicon ? "Favicon" : "Logo"}`}</span>}<input type="file" accept={accept} className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label><div className="flex flex-wrap items-center gap-2"><label className="inline-flex cursor-pointer rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><input type="file" accept={accept} className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />{value ? "Replace" : `Upload ${favicon ? "Favicon" : "Logo"}`}</label><button type="button" onClick={() => setShowExternal((current) => !current)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Use external URL</button></div>{filename && <p className="text-xs text-slate-500">{filename}</p>}<p className="text-xs text-slate-500">{favicon ? "PNG, SVG or ICO. Max 2 MB." : "PNG, SVG or WEBP. Max 5 MB."}</p>{showExternal && <label className="grid gap-1 text-xs text-slate-600">External public URL<input value={value} onChange={(event) => applyExternal(event.target.value)} placeholder="https://example.com/logo.svg" className="rounded-md border border-slate-200 px-3 py-2 text-sm" /></label>}{error && <p className="text-xs font-semibold text-red-600">{error}</p>}</div>;
}

function SocialField({ icon, label, name, value, onChange }: { icon: React.ReactNode; label: string; name: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium"><span className="flex items-center gap-2">{icon}{label}</span><input name={name} value={value} onChange={(event) => onChange(event.target.value)} placeholder={`${label} handle or URL`} className="rounded-md border border-slate-200 px-3 py-2" /></label>;
}

function Choice({ label, name, value, options, onChange }: { label: string; name: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const choices = value && !options.includes(value) ? [value, ...options] : options;
  return <label className="grid gap-2 text-sm font-medium">{label}<select name={name} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">Select one</option>{choices.map((option, index) => <option key={`${option}-${index}`} value={option}>{option}</option>)}</select></label>;
}

function ReviewCard({ draft, percent, palette }: { draft: BusinessDraft; percent: number; palette: Record<string, string> }) {
  return <StepCard icon={<Sparkles size={20} />} title="Review" intro="A final check before Studio uses this profile for content generation."><div className="md:col-span-2 rounded-lg border border-slate-200 p-4"><p className="text-3xl font-semibold">{percent}% Complete</p><p className="mt-2 text-sm text-slate-500">{draft.name || "New business"} · {draft.tagline || "Brand profile"}</p><div className="mt-4 flex gap-2">{Object.entries(palette).map(([role, color], index) => <span key={`${role}-${color}-${index}`} className="size-8 rounded-full border border-slate-200" style={{ background: color }} title={`${role}: ${color}`} />)}</div></div></StepCard>;
}

function LivePreview({ draft, palette, percent }: { draft: BusinessDraft; palette: Record<string, string>; percent: number }) {
  const tagline = draft.tagline || "Brand profile";
  return <aside className="space-y-4"><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">Live Brand Preview</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{percent}% Complete</span></div><div className="mt-4 rounded-lg p-5" style={{ background: palette.background, color: palette.text }}><div className="text-sm font-semibold" style={{ color: palette.primary }}>{draft.name || "New business"}</div><h3 className="mt-3 text-2xl font-semibold">AI-Powered Marketing & Brand Operations Platform</h3><p className="mt-2 text-sm opacity-80">{tagline}</p><button type="button" className="mt-5 rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ background: palette.accent }}>{draft.defaultCallToAction || "Primary action"}</button></div></section><PreviewTile title="Business Card" body={tagline} palette={palette} /><PreviewTile title="Instagram Post" body="Create once. Approve once. Use everywhere." palette={palette} /><PreviewTile title="LinkedIn Banner" body="Professional content systems for growing businesses." palette={palette} /><PreviewTile title="Website Hero" body={draft.name || "New business"} palette={palette} /></aside>;
}

function PreviewTile({ title, body, palette }: { title: string; body: string; palette: Record<string, string> }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="rounded-lg p-4" style={{ background: palette.primary, color: "#fff" }}><p className="text-xs font-semibold uppercase opacity-80">{title}</p><p className="mt-3 text-lg font-semibold">{body}</p></div></section>;
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  return `rgb(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255})`;
}
