"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";

type Company = { id: string; name: string; slug: string; orderingSlug?: string | null; commerceEnabled?: boolean; studioEnabled?: boolean };
type Category = { id: string; name: string };
type Product = { id: string; name: string };
type Campaign = { id: string; name: string; companyId?: string };

async function send(url: string, body: Record<string, unknown>, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

function useNotice() {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  return { notice, error, ok: (message: string) => { setNotice(message); setError(""); }, fail: (err: unknown) => { setError(err instanceof Error ? err.message : "Something went wrong"); setNotice(""); } };
}

export function CompanyForm({ company, showFeatureFlags = true }: { company?: Company & Record<string, unknown>; showFeatureFlags?: boolean }) {
  const state = useNotice();
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      try { await send(company ? `/api/company/${company.id}` : "/api/company", values, company ? "PUT" : "POST"); state.ok("Company saved"); } catch (error) { state.fail(error); }
    }}>
      {["name", "slug", "industry", "country", "city", "address", "phone", "whatsapp", "email", "website", "targetAudience", "productsSummary", "brandPersonality", "preferredLanguage"].map((name) => (
        <label key={name} className="grid gap-1 text-sm font-medium capitalize">{name}<input name={name} defaultValue={String(company?.[name] ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label>
      ))}
      <label className="grid gap-1 text-sm font-medium">Business type<select name="businessType" defaultValue={String(company?.businessType ?? "OTHER")} className="rounded-md border border-slate-200 px-3 py-2">{["RESTAURANT","GROCERY","HOTEL","RECRUITMENT_AGENCY","MANPOWER_CONSULTANCY","HR_CONSULTANCY","CLINIC","RETAIL","EDUCATION","SERVICE_BUSINESS","OTHER"].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium md:col-span-2">Description<textarea name="description" defaultValue={String(company?.description ?? "")} className="min-h-24 rounded-md border border-slate-200 px-3 py-2" /></label>
      {showFeatureFlags && ["commerceEnabled", "studioEnabled", "recruitmentEnabled"].map((name) => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={Boolean(company?.[name])} />{name}</label>)}
      <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save company</button>
      {state.notice && <p className="text-sm text-emerald-700">{state.notice}</p>}{state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function BrandForm({ companies }: { companies: Company[] }) {
  const state = useNotice();
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); try { await send("/api/brand-kit", Object.fromEntries(new FormData(event.currentTarget))); state.ok("Brand Kit saved"); } catch (error) { state.fail(error); } }}>
      <CompanySelect companies={companies} />
      {["tagline","logoPath","secondaryLogoPath","lightLogoPath","darkLogoPath","faviconPath","headingFont","bodyFont","brandTone","visualStyle","preferredImageStyle","preferredVideoStyle","defaultCallToAction","ctaStyle","instagramHandle","facebookPage","linkedinPage","whatsappNumber"].map((name) => <label key={name} className="grid gap-1 text-sm font-medium capitalize">{name}<input name={name} className="rounded-md border border-slate-200 px-3 py-2" /></label>)}
      {["primaryColor","secondaryColor","accentColor","backgroundColor","textColor"].map((name) => <label key={name} className="grid gap-1 text-sm font-medium capitalize">{name}<input type="color" name={name} defaultValue={name === "backgroundColor" ? "#ffffff" : name === "textColor" ? "#111827" : name === "secondaryColor" ? "#14b8a6" : name === "accentColor" ? "#f97316" : "#2563eb"} className="h-11 rounded-md border border-slate-200" /></label>)}
      <label className="grid gap-1 text-sm font-medium md:col-span-2">Approval status<select name="approvalStatus" defaultValue="APPROVED" className="rounded-md border border-slate-200 px-3 py-2"><option>DRAFT</option><option>PENDING_REVIEW</option><option>APPROVED</option><option>REJECTED</option></select></label>
      <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save Brand Kit</button>
      {state.notice && <p className="text-sm text-emerald-700">{state.notice}</p>}{state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function CommerceForm({ companies, categories }: { companies: Company[]; categories?: Category[] }) {
  const state = useNotice();
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={async (event) => {
      event.preventDefault(); const form = Object.fromEntries(new FormData(event.currentTarget));
      const url = form.kind === "category" ? "/api/commerce/categories" : form.kind === "delivery" ? "/api/commerce/delivery" : "/api/commerce/products";
      try { await send(url, form); state.ok("Saved"); } catch (error) { state.fail(error); }
    }}>
      <CompanySelect companies={companies} /><input type="hidden" name="kind" value={categories ? "product" : "category"} />
      {categories && <label className="grid gap-1 text-sm font-medium">Category<select name="categoryId" className="rounded-md border border-slate-200 px-3 py-2"><option value="">Unassigned</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
      {["name","slug","description","imagePath"].map((name) => <label key={name} className="grid gap-1 text-sm font-medium capitalize">{name}<input name={name} className="rounded-md border border-slate-200 px-3 py-2" /></label>)}
      {categories && ["regularPrice","promotionalPrice","preparationMinutes","displayOrder"].map((name) => <label key={name} className="grid gap-1 text-sm font-medium capitalize">{name}<input name={name} type="number" step="0.01" className="rounded-md border border-slate-200 px-3 py-2" /></label>)}
      {categories && <label className="grid gap-1 text-sm font-medium">Inventory mode<select name="inventoryMode" defaultValue="ALWAYS_AVAILABLE" className="rounded-md border border-slate-200 px-3 py-2"><option>ALWAYS_AVAILABLE</option><option>AVAILABILITY_ONLY</option><option>TRACK_QUANTITY</option></select></label>}
      {categories && ["inventoryQuantity","lowStockThreshold"].map((name) => <label key={name} className="grid gap-1 text-sm font-medium capitalize">{name}<input name={name} type="number" min="0" className="rounded-md border border-slate-200 px-3 py-2" /></label>)}
      {categories && ["vegetarian","available","featured"].map((name) => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={name === "available"} />{name}</label>)}
      <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save</button>
      {state.notice && <p className="text-sm text-emerald-700">{state.notice}</p>}{state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function DeliveryForm({ companies }: { companies: Company[] }) {
  const state = useNotice();
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); try { await send("/api/commerce/delivery", Object.fromEntries(new FormData(event.currentTarget))); state.ok("Delivery zone saved"); } catch (error) { state.fail(error); } }}><CompanySelect companies={companies} />{["name","radiusKm","deliveryCharge","minimumOrderAmount"].map((name) => <label key={name} className="grid gap-1 text-sm font-medium">{name}<input name={name} type={name === "name" ? "text" : "number"} step="0.01" className="rounded-md border border-slate-200 px-3 py-2" /></label>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked />Active</label><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save delivery</button>{state.notice && <p className="text-sm text-emerald-700">{state.notice}</p>}{state.error && <p className="text-sm text-red-600">{state.error}</p>}</form>;
}

const uploadPlatforms = [
  ["INSTAGRAM", "Instagram Portrait"],
  ["INSTAGRAM_SQUARE", "Instagram Post"],
  ["INSTAGRAM_STORY", "Instagram Story"],
  ["FACEBOOK", "Facebook Post"],
  ["LINKEDIN", "LinkedIn Post"],
  ["WHATSAPP", "WhatsApp Creative"],
] as const;

export function UploadForm({ companies, campaigns = [], products = [], target = "media" }: { companies: Company[]; campaigns?: Campaign[]; products?: Product[]; target?: "media" | "brand" }) {
  const state = useNotice();
  const router = useRouter();
  const params = useSearchParams();
  const defaultCompanyId = params.get("companyId") ?? companies[0]?.id ?? "";
  const defaultCampaignId = params.get("campaignId") ?? "";
  const defaultPlatform = params.get("platform") ?? "INSTAGRAM";
  const defaultAssetType = params.get("assetType") ?? "POSTER";
  return <form className="grid gap-4" onSubmit={async (event) => { event.preventDefault(); try { const response = await fetch("/api/uploads", { method: "POST", body: new FormData(event.currentTarget) }); const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Upload failed"); state.ok(json.metadataJson?.dimensionWarning ? `Upload saved. ${json.metadataJson.dimensionWarning}` : "Upload saved"); router.refresh(); } catch (error) { state.fail(error); } }}><CompanySelect companies={companies} defaultValue={defaultCompanyId} /><input type="hidden" name="target" value={target} />{target === "media" && <><label className="grid gap-1 text-sm font-medium">Campaign<select name="campaignId" defaultValue={defaultCampaignId} className="rounded-md border border-slate-200 px-3 py-2"><option value="">No campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Product <span className="text-xs font-normal text-slate-500">(Optional)</span><select name="productId" className="rounded-md border border-slate-200 px-3 py-2"><option value="">No product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Title<input name="title" required placeholder="SettleSmart Careers poster" className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Media Type<select name="assetType" defaultValue={defaultAssetType} className="rounded-md border border-slate-200 px-3 py-2">{["IMAGE","POSTER","BANNER","REEL","VIDEO","LOGO","DOCUMENT"].map((x) => <option key={x}>{x}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Category<select name="category" defaultValue="RECRUITMENT" className="rounded-md border border-slate-200 px-3 py-2">{["BRAND","RECRUITMENT","PRODUCT","MENU","SERVICE","OFFER","COMPANY","SOCIAL","ORDERING_APP"].map((x) => <option key={x}>{x}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Platform<select name="platform" defaultValue={defaultPlatform} className="rounded-md border border-slate-200 px-3 py-2">{uploadPlatforms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Caption / Description<textarea name="description" placeholder="Optional caption or notes for reviewers" className="min-h-20 rounded-md border border-slate-200 px-3 py-2" /></label><p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">Uploaded media is saved as Source: Uploaded. PNG, JPEG, WEBP and SVG are accepted up to 10 MB for poster/image uploads.</p></>}<label className="grid gap-1 text-sm font-medium">File<input type="file" required name="file" accept={target === "media" ? "image/png,image/jpeg,image/webp,image/svg+xml" : undefined} className="rounded-md border border-slate-200 px-3 py-2" /></label><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Upload</button>{state.notice && <p className="text-sm text-emerald-700">{state.notice}</p>}{state.error && <p className="text-sm text-red-600">{state.error}</p>}</form>;
}

export function CampaignForm({ companies, products }: { companies: Company[]; products: Product[] }) {
  const state = useNotice();
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); const values: Record<string, unknown> = Object.fromEntries(formData); values.selectedPlatformsJson = formData.getAll("platform"); try { await send("/api/campaigns", values); state.ok("Campaign saved. AI content generation will be enabled in Wave 2."); } catch (error) { state.fail(error); } }}><CompanySelect companies={companies} /><input name="name" placeholder="Campaign name" className="rounded-md border border-slate-200 px-3 py-2" /><select name="campaignType" className="rounded-md border border-slate-200 px-3 py-2">{["RECRUITMENT","PRODUCT","MENU_ITEM","SERVICE","OFFER","EVENT","ANNOUNCEMENT","COMPANY_PROFILE"].map((x) => <option key={x}>{x}</option>)}</select><select name="productId" className="rounded-md border border-slate-200 px-3 py-2"><option value="">Optional product</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><textarea name="objective" placeholder="Objective" className="min-h-24 rounded-md border border-slate-200 px-3 py-2 md:col-span-2" /><textarea name="inputText" placeholder="Source text" className="min-h-24 rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />{["Instagram","Facebook","LinkedIn","WhatsApp"].map((x) => <label key={x} className="flex items-center gap-2 text-sm"><input name="platform" value={x} type="checkbox" />{x}</label>)}<button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save campaign</button>{state.notice && <p className="text-sm text-emerald-700 md:col-span-2">{state.notice}</p>}{state.error && <p className="text-sm text-red-600 md:col-span-2">{state.error}</p>}</form>;
}

export function OrderStatusForm({ orderId, status }: { orderId: string; status: string }) {
  const state = useNotice();
  return <form className="flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); try { await send(`/api/orders/${orderId}`, Object.fromEntries(new FormData(event.currentTarget)), "PATCH"); state.ok("Order updated"); } catch (error) { state.fail(error); } }}><select name="status" defaultValue={status} className="rounded-md border border-slate-200 px-3 py-2">{["PENDING","ACCEPTED","PREPARING","READY","RIDER_ASSIGNED","PICKED_UP","OUT_FOR_DELIVERY","DELIVERED","PAYMENT_COLLECTED","COMPLETED","CANCELLED","REJECTED"].map((x) => <option key={x}>{x}</option>)}</select><input name="note" placeholder="Note" className="rounded-md border border-slate-200 px-3 py-2" /><input name="reason" placeholder="Reason for reject/cancel" className="rounded-md border border-slate-200 px-3 py-2" /><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Update</button>{state.notice && <span className="text-sm text-emerald-700">{state.notice}</span>}{state.error && <span className="text-sm text-red-600">{state.error}</span>}</form>;
}

export function QrCodeBox({ url }: { url: string }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(url).then((value) => { if (mounted) setQr(value); }).catch(() => { if (mounted) setQr(""); });
    return () => { mounted = false; };
  }, [url]);
  async function copyLink() {
    await navigator.clipboard?.writeText(url);
  }
  async function shareQr() {
    const shareData = { title: "Store link", text: url, url };
    if (!navigator.share) return copyLink();
    if (!qr || !navigator.canShare) return navigator.share(shareData);
    const blob = await (await fetch(qr)).blob();
    const file = new File([blob], "ordering-qr.png", { type: "image/png" });
    return navigator.canShare({ files: [file] }) ? navigator.share({ ...shareData, files: [file] }) : navigator.share(shareData);
  }
  return <div className="space-y-3">{qr && <img src={qr} alt="Ordering QR code" className="size-40 rounded-md border border-slate-200 bg-white p-2" />}<div className="break-all text-sm text-slate-600">{url}</div><div className="flex flex-wrap gap-2">{qr && <a href={qr} download="ordering-qr.png" className="inline-flex rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Download QR</a>}<button type="button" onClick={copyLink} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Copy Link</button><button type="button" onClick={() => void shareQr()} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Share QR</button></div></div>;
}

function CompanySelect({ companies, defaultValue = "" }: { companies: Company[]; defaultValue?: string }) {
  return <label className="grid gap-1 text-sm font-medium">Company<select required name="companyId" defaultValue={defaultValue} className="rounded-md border border-slate-200 px-3 py-2"><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>;
}
