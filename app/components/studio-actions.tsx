"use client";

import { useState } from "react";

type Company = { id: string; name: string; brandProfile?: { approvalStatus: string } | null };
type Campaign = { id: string; name: string };
type Media = { id: string; title: string; companyId: string; approvalStatus: string };

async function post(url: string, body: Record<string, unknown>, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function StudioWizard({ companies, campaigns }: { companies: Company[]; campaigns: Campaign[] }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
        setError(""); setMessage("");
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          const input = await post("/api/studio/extract", { campaignId: data.campaignId, rawInput: data.rawInput, sourceType: data.sourceType });
          await post("/api/studio/extract", { campaignId: data.campaignId, structuredDetailsJson: input.structuredDetailsJson, approved: true }, "PATCH");
          await post("/api/studio/generate", { campaignId: data.campaignId, platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP", "REEL"] });
          await post("/api/studio/poster", { campaignId: data.campaignId, platform: data.platform });
          await post("/api/studio/storyboard", { campaignId: data.campaignId });
          setMessage("Demo intelligence generated copy, poster and storyboard. Refresh the campaign to review outputs.");
        } catch (err) { setError(err instanceof Error ? err.message : "Studio generation failed"); }
      }}>
        <label className="grid gap-1 text-sm font-medium">Campaign<select name="campaignId" required className="rounded-md border border-slate-200 px-3 py-2">{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Source type<select name="sourceType" className="rounded-md border border-slate-200 px-3 py-2"><option>MANUAL</option><option>PRODUCT</option><option>MEDIA</option><option>JOB_DESCRIPTION</option><option>BUSINESS_DESCRIPTION</option></select></label>
        <label className="grid gap-1 text-sm font-medium">Poster format<select name="platform" className="rounded-md border border-slate-200 px-3 py-2"><option>INSTAGRAM</option><option>INSTAGRAM_STORY</option><option>SQUARE</option><option>FACEBOOK</option><option>LINKEDIN</option><option>WHATSAPP</option><option>BANNER</option></select></label>
        <textarea name="rawInput" placeholder="Paste job description, offer, product notes, or campaign brief" className="min-h-36 rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Run Studio Intelligence</button>
        {message && <p className="text-sm text-emerald-700 md:col-span-2">{message}</p>}
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
      </form>
    </div>
  );
}

export function UseInBusinessForm({ media, campaigns }: { media: Media[]; campaigns: Campaign[] }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const asset = media.find((item) => item.id === data.mediaAssetId); try { await post("/api/studio/placements", { ...data, companyId: asset?.companyId, active: true }); setMessage("Media placed in business."); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Placement failed"); setMessage(""); } }}><select name="mediaAssetId" className="rounded-md border border-slate-200 px-3 py-2">{media.map((m) => <option key={m.id} value={m.id}>{m.title} · {m.approvalStatus}</option>)}</select><select name="campaignId" className="rounded-md border border-slate-200 px-3 py-2"><option value="">No campaign</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="placement" className="rounded-md border border-slate-200 px-3 py-2"><option>ORDERING_HOMEPAGE_HERO</option><option>ORDERING_PROMOTIONAL_BANNER</option><option>ORDERING_PRODUCT_IMAGE</option><option>ORDERING_SPECIAL_OFFER</option><option>COMPANY_PROFILE</option><option>RECRUITMENT_JOB_PAGE</option></select><input name="cta" placeholder="CTA" className="rounded-md border border-slate-200 px-3 py-2" /><input name="destinationUrl" placeholder="Destination URL" className="rounded-md border border-slate-200 px-3 py-2" /><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Use in Business</button>{message && <p className="text-sm text-emerald-700">{message}</p>}{error && <p className="text-sm text-red-600">{error}</p>}</form>;
}
