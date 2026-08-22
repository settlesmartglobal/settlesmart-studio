"use client";

import type { ClientProduct } from "@/modules/wave1/serialization";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function jsonRequest(url: string, body: Record<string, unknown>, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function ProductActionBar({ productId, productSlug, orderingSlug, inStock, available }: { productId: string; productSlug: string; orderingSlug?: string | null; inStock: boolean; available: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function run(action: string, body: Record<string, unknown> = {}) {
    setBusy(action);
    setError("");
    try {
      await jsonRequest(`/api/commerce/products/${productId}`, { action, ...body }, "PATCH");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product update failed");
    } finally {
      setBusy("");
    }
  }
  return <div className="mt-3 flex flex-wrap gap-2 text-xs"><a href={`/commerce/products/${productId}/edit`} className="rounded bg-slate-100 px-2 py-1 font-semibold">Edit</a><button disabled={busy !== ""} onClick={() => run("DUPLICATE")} className="rounded bg-slate-100 px-2 py-1 font-semibold disabled:opacity-50">{busy === "DUPLICATE" ? "Duplicating..." : "Duplicate"}</button><button disabled={busy !== ""} onClick={() => run("SET_STOCK", { inStock: !inStock })} className="rounded bg-slate-100 px-2 py-1 font-semibold disabled:opacity-50">{inStock ? "Mark out of stock" : "Mark in stock"}</button><button disabled={busy !== ""} onClick={() => run("SET_ACTIVE", { available: !available })} className="rounded bg-slate-100 px-2 py-1 font-semibold disabled:opacity-50">{available ? "Deactivate" : "Activate"}</button>{orderingSlug && <a href={`/order/${orderingSlug}/product/${productSlug}`} className="rounded bg-slate-100 px-2 py-1 font-semibold">Preview</a>}{error && <p className="basis-full text-red-600">{error}</p>}</div>;
}

export function InventoryControls({ productId, mode }: { productId: string; mode: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function run(action: string, formData: FormData) {
    setBusy(action);
    setError("");
    try {
      await jsonRequest(`/api/commerce/products/${productId}`, { action, quantity: formData.get("quantity") }, "PATCH");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inventory update failed");
    } finally {
      setBusy("");
    }
  }
  if (mode !== "TRACK_QUANTITY") return null;
  return <form className="flex flex-wrap items-center gap-2 text-xs" onSubmit={async (event) => { event.preventDefault(); await run(String(new FormData(event.currentTarget).get("action")), new FormData(event.currentTarget)); }}><input name="quantity" type="number" min="0" defaultValue="1" className="w-24 rounded border border-slate-200 px-2 py-1" /><button name="action" value="ADD_STOCK" disabled={busy !== ""} className="rounded bg-slate-100 px-2 py-1 font-semibold disabled:opacity-50">Add Stock</button><button name="action" value="ADJUST_STOCK" disabled={busy !== ""} className="rounded bg-slate-100 px-2 py-1 font-semibold disabled:opacity-50">Adjust Stock</button>{error && <p className="basis-full text-red-600">{error}</p>}</form>;
}

export function ProductEditForm({ product, categories }: { product: ClientProduct; categories: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const values: Record<string, unknown> = Object.fromEntries(formData);
    values.vegetarian = formData.has("vegetarian");
    values.available = formData.has("available");
    values.featured = formData.has("featured");
    const variantIndexes = Array.from(new Set(Array.from(formData.keys()).map((key) => /^variants\[(\d+)\]/.exec(String(key))?.[1]).filter(Boolean)));
    const variants = variantIndexes.map((index) => ({
      id: String(formData.get(`variants[${index}].id`) ?? ""),
      name: String(formData.get(`variants[${index}].name`) ?? ""),
      description: String(formData.get(`variants[${index}].description`) ?? ""),
      price: formData.get(`variants[${index}].price`),
      active: formData.has(`variants[${index}].active`),
      displayOrder: formData.get(`variants[${index}].displayOrder`),
    })).filter((variant) => variant.name.trim() || variant.id);
    try {
      await jsonRequest(`/api/commerce/products/${product.id}`, { action: "UPDATE", product: values, variants }, "PATCH");
      setMessage("Product updated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product update failed");
    }
  }}><label className="grid gap-1 text-sm font-medium">Name<input name="name" defaultValue={String(product.name ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Slug<input name="slug" defaultValue={String(product.slug ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Category<select name="categoryId" defaultValue={String(product.categoryId ?? "")} className="rounded-md border border-slate-200 px-3 py-2"><option value="">Unassigned</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Image path<input name="imagePath" defaultValue={String(product.imagePath ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium md:col-span-2">Short description<input name="shortDescription" defaultValue={String(product.shortDescription ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium md:col-span-2">Description<textarea name="description" defaultValue={String(product.description ?? "")} className="min-h-24 rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Regular price<input name="regularPrice" type="number" step="0.01" defaultValue={String(product.regularPrice ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Promotional price<input name="promotionalPrice" type="number" step="0.01" defaultValue={String(product.promotionalPrice ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><fieldset className="grid gap-3 rounded-md border border-slate-200 p-3 md:col-span-2"><legend className="px-1 text-sm font-semibold">Variants</legend>{(product.variants ?? []).map((variant, index) => <div key={variant.id} className="grid gap-2 rounded-md bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_120px_90px_90px]"><input type="hidden" name={`variants[${index}].id`} defaultValue={variant.id} /><input name={`variants[${index}].name`} defaultValue={variant.name} placeholder="Variant name" className="rounded-md border border-slate-200 px-3 py-2" /><input name={`variants[${index}].description`} defaultValue={variant.description ?? ""} placeholder="Serves / Size" className="rounded-md border border-slate-200 px-3 py-2" /><input name={`variants[${index}].price`} type="number" step="0.01" min="0" defaultValue={String(variant.price ?? product.regularPrice + variant.priceDelta)} placeholder="AED" className="rounded-md border border-slate-200 px-3 py-2" /><input name={`variants[${index}].displayOrder`} type="number" min="0" defaultValue={String(variant.displayOrder)} placeholder="Order" className="rounded-md border border-slate-200 px-3 py-2" /><label className="flex items-center gap-2 text-sm"><input name={`variants[${index}].active`} type="checkbox" defaultChecked={variant.active} />Active</label></div>)}<div className="grid gap-2 rounded-md bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_120px_90px]"><input name={`variants[${product.variants?.length ?? 0}].name`} placeholder="New variant" className="rounded-md border border-slate-200 px-3 py-2" /><input name={`variants[${product.variants?.length ?? 0}].description`} placeholder="Serves / Size" className="rounded-md border border-slate-200 px-3 py-2" /><input name={`variants[${product.variants?.length ?? 0}].price`} type="number" step="0.01" min="0" placeholder="AED" className="rounded-md border border-slate-200 px-3 py-2" /><input name={`variants[${product.variants?.length ?? 0}].displayOrder`} type="number" min="0" defaultValue={String(product.variants?.length ?? 0)} placeholder="Order" className="rounded-md border border-slate-200 px-3 py-2" /><label className="flex items-center gap-2 text-sm"><input name={`variants[${product.variants?.length ?? 0}].active`} type="checkbox" defaultChecked />Active</label></div></fieldset><label className="grid gap-1 text-sm font-medium">Inventory mode<select name="inventoryMode" defaultValue={String(product.inventoryMode ?? "ALWAYS_AVAILABLE")} className="rounded-md border border-slate-200 px-3 py-2"><option>ALWAYS_AVAILABLE</option><option>AVAILABILITY_ONLY</option><option>TRACK_QUANTITY</option></select></label><label className="grid gap-1 text-sm font-medium">Current quantity<input name="inventoryQuantity" type="number" min="0" defaultValue={String(product.inventoryQuantity ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Low-stock threshold<input name="lowStockThreshold" type="number" min="0" defaultValue={String(product.lowStockThreshold ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Preparation minutes<input name="preparationMinutes" type="number" defaultValue={String(product.preparationMinutes ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Display order<input name="displayOrder" type="number" defaultValue={String(product.displayOrder ?? 0)} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="flex items-center gap-2 text-sm"><input name="vegetarian" type="checkbox" defaultChecked={Boolean(product.vegetarian)} />Vegetarian</label><label className="flex items-center gap-2 text-sm"><input name="available" type="checkbox" defaultChecked={Boolean(product.available)} />Active</label><label className="flex items-center gap-2 text-sm"><input name="featured" type="checkbox" defaultChecked={Boolean(product.featured)} />Featured</label><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save product</button>{message && <p className="text-sm text-emerald-700">{message}</p>}{error && <p className="text-sm text-red-600">{error}</p>}</form>;
}

export function RiderCreateForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <form className="grid gap-2 text-sm" onSubmit={async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await jsonRequest("/api/commerce/riders", { ...values, companyId });
      setMessage("Rider added");
      event.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rider creation failed");
    }
  }}><input name="name" required placeholder="Rider name" className="rounded-md border border-slate-200 px-3 py-2" /><input name="mobile" required placeholder="Mobile" className="rounded-md border border-slate-200 px-3 py-2" /><input name="email" placeholder="Email optional" className="rounded-md border border-slate-200 px-3 py-2" /><input name="vehicleType" placeholder="Vehicle type" className="rounded-md border border-slate-200 px-3 py-2" /><input name="vehicleNumber" placeholder="Vehicle number" className="rounded-md border border-slate-200 px-3 py-2" /><textarea name="notes" placeholder="Notes" className="min-h-20 rounded-md border border-slate-200 px-3 py-2" /><button className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white">Add rider</button>{message && <p className="text-emerald-700">{message}</p>}{error && <p className="text-red-600">{error}</p>}</form>;
}

export function FeedbackForm({ orderNumber, token }: { orderNumber: string; token: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <form className="mt-6 grid gap-2" onSubmit={async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await jsonRequest(`/api/public/orders/${orderNumber}/feedback`, { ...values, token });
      setMessage("Feedback submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed");
    }
  }}><h2 className="font-semibold">Feedback</h2><select name="rating" className="rounded-md border border-slate-200 px-3 py-2"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select><textarea name="comment" placeholder="Comment optional" className="rounded-md border border-slate-200 px-3 py-2" /><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Submit feedback</button>{message && <p className="text-sm text-emerald-700">{message}</p>}{error && <p className="text-sm text-red-600">{error}</p>}</form>;
}

export function WhatsAppTestForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <form className="mt-3 grid gap-2 text-sm" onSubmit={async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/commerce/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Test notification failed");
      return;
    }
    setMessage(`Stored as ${json.event.status} using ${json.provider}`);
  }}>
    <input name="mobile" required placeholder="Mobile number" className="rounded-md border border-slate-200 px-3 py-2" />
    <select name="eventType" className="rounded-md border border-slate-200 px-3 py-2"><option>ORDER_CREATED</option><option>ORDER_ACCEPTED</option><option>ORDER_OUT_FOR_DELIVERY</option><option>ORDER_DELIVERED</option><option>PAYMENT_COLLECTED</option></select>
    <button className="rounded-md bg-slate-950 px-3 py-2 font-semibold text-white">Send Test Message</button>
    {message && <p className="text-emerald-700">{message}</p>}
    {error && <p className="text-red-600">{error}</p>}
  </form>;
}

export function CatalogueImportForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<{ rowsProcessed: number; valid: number; warnings: Array<{ row: number; message: string }>; errors: Array<{ row: number; message: string }> } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submitForm(formElement: HTMLFormElement, confirm: boolean) {
    setError("");
    setMessage("");
    const form = new FormData(formElement);
    form.set("companyId", companyId);
    form.set("confirm", String(confirm));
    const response = await fetch("/api/commerce/catalogue/import", { method: "POST", body: form });
    const json = await response.json();
    if (!response.ok) {
      setPreview(json.preview ?? null);
      setError(json.error ?? "Catalogue import failed");
      return;
    }
    setPreview(json.preview);
    if (confirm) {
      setMessage(`Import complete. Created ${json.created}, updated ${json.updated}.`);
      router.refresh();
    }
  }
  return <form className="grid gap-3 text-sm" onSubmit={(event) => { event.preventDefault(); void submitForm(event.currentTarget, false); }}><div className="flex flex-wrap gap-2"><a href="/api/commerce/catalogue/template" className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Download Template</a><a href={`/api/commerce/catalogue/export?companyId=${companyId}`} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Export Catalogue</a></div><input name="file" required type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="rounded-md border border-slate-200 px-3 py-2" /><select name="mode" defaultValue="CREATE_NEW" className="rounded-md border border-slate-200 px-3 py-2"><option value="CREATE_NEW">Create new</option><option value="CREATE_OR_UPDATE">Create or update</option></select><div className="flex flex-wrap gap-2"><button className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Preview Import</button><button type="button" onClick={(event) => { const form = event.currentTarget.form; if (form) void submitForm(form, true); }} disabled={!preview || preview.errors.length > 0} className="rounded-md bg-slate-950 px-3 py-2 font-semibold text-white disabled:opacity-50">Confirm Import</button></div>{preview && <div className="rounded-md bg-slate-50 p-3"><p className="font-semibold">{preview.rowsProcessed} rows processed · {preview.valid} valid · {preview.warnings.length} warnings · {preview.errors.length} errors</p>{[...preview.errors, ...preview.warnings].slice(0, 8).map((issue) => <p key={`${issue.row}-${issue.message}`} className="mt-1 text-xs">Row {issue.row}: {issue.message}</p>)}</div>}{message && <p className="text-emerald-700">{message}</p>}{error && <p className="text-red-600">{error}</p>}</form>;
}

type CommerceSettingsCompany = {
  id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  commerceSettings?: Record<string, unknown> | null;
  branches?: Array<{ temporarilyClosed: boolean; hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; closed: boolean }> }>;
};

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CommerceSettingsForm({ company }: { company: CommerceSettingsCompany }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const settings = company.commerceSettings ?? {};
  const branch = company.branches?.[0];
  const hours = branch?.hours?.length ? branch.hours : [];
  return <form className="grid gap-3 text-sm md:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form);
    body.companyId = company.id;
    for (const name of ["deliveryEnabled", "pickupEnabled", "cashPaymentEnabled", "cardOnDeliveryEnabled", "onlinePaymentEnabled", "acceptingOrders", "temporarilyClosed"]) body[name] = form.has(name);
    body.days = dayLabels.map((_, dayOfWeek) => ({ dayOfWeek, openTime: form.get(`openTime-${dayOfWeek}`), closeTime: form.get(`closeTime-${dayOfWeek}`), closed: form.has(`closed-${dayOfWeek}`) }));
    try {
      await jsonRequest("/api/commerce/settings", body, "PUT");
      setMessage("Business settings saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settings save failed");
    }
  }}>
    <input name="name" required defaultValue={company.name} placeholder="Business name" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="description" defaultValue={company.description ?? String(settings.description ?? "")} placeholder="Description" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="phone" defaultValue={company.phone ?? ""} placeholder="Phone" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="whatsapp" defaultValue={company.whatsapp ?? ""} placeholder="WhatsApp" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="email" defaultValue={company.email ?? ""} placeholder="Email" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="address" defaultValue={company.address ?? ""} placeholder="Address" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="city" defaultValue={company.city ?? "Dubai"} placeholder="City" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="area" defaultValue="" placeholder="Area" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="latitude" type="number" step="0.0000001" defaultValue={String(company.latitude ?? "")} placeholder="Latitude" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="longitude" type="number" step="0.0000001" defaultValue={String(company.longitude ?? "")} placeholder="Longitude" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="currency" defaultValue={String(settings.currency ?? "AED")} placeholder="Currency" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="timezone" defaultValue={String(settings.timezone ?? "Asia/Dubai")} placeholder="Timezone" className="rounded-md border border-slate-200 px-3 py-2" />
    {["taxPercentage", "minimumOrderAmount", "deliveryCharge", "freeDeliveryThreshold", "preparationMinutes", "deliveryRadiusKm"].map((name) => <input key={name} name={name} type="number" step="0.01" defaultValue={String(settings[name] ?? (name === "taxPercentage" ? 5 : name === "preparationMinutes" ? 30 : name === "deliveryRadiusKm" ? 5 : 0))} placeholder={name} className="rounded-md border border-slate-200 px-3 py-2" />)}
    <input name="logoPath" defaultValue={String(settings.logoPath ?? "")} placeholder="Logo path" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="coverImagePath" defaultValue={String(settings.coverImagePath ?? "")} placeholder="Cover image path" className="rounded-md border border-slate-200 px-3 py-2" />
    <textarea name="terms" defaultValue={String(settings.terms ?? "")} placeholder="Terms" className="min-h-20 rounded-md border border-slate-200 px-3 py-2" />
    <textarea name="cancellationPolicy" defaultValue={String(settings.cancellationPolicy ?? "")} placeholder="Cancellation policy" className="min-h-20 rounded-md border border-slate-200 px-3 py-2" />
    <textarea name="temporaryClosureMessage" defaultValue={String(settings.temporaryClosureMessage ?? "")} placeholder="Temporary closure message" className="min-h-20 rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />
    <div className="grid gap-2 md:col-span-2 sm:grid-cols-4">{["deliveryEnabled", "pickupEnabled", "cashPaymentEnabled", "cardOnDeliveryEnabled", "onlinePaymentEnabled", "acceptingOrders", "temporarilyClosed"].map((name) => <label key={name} className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={name === "temporarilyClosed" ? Boolean(branch?.temporarilyClosed) : Boolean(settings[name] ?? name !== "onlinePaymentEnabled")} />{name}</label>)}</div>
    <fieldset className="grid gap-2 rounded-md border border-slate-200 p-3 md:col-span-2"><legend className="px-1 font-semibold">Opening hours</legend>{dayLabels.map((label, dayOfWeek) => { const row = hours.find((hour) => hour.dayOfWeek === dayOfWeek); return <div key={label} className="grid gap-2 sm:grid-cols-[1fr_120px_120px_90px]"><span>{label}</span><input name={`openTime-${dayOfWeek}`} defaultValue={row?.openTime ?? "09:00"} className="rounded border border-slate-200 px-2 py-1" /><input name={`closeTime-${dayOfWeek}`} defaultValue={row?.closeTime ?? "23:00"} className="rounded border border-slate-200 px-2 py-1" /><label className="flex items-center gap-1"><input type="checkbox" name={`closed-${dayOfWeek}`} defaultChecked={row?.closed ?? false} />Closed</label></div>; })}</fieldset>
    <button className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white md:col-span-2">Save business settings</button>
    {message && <p className="text-emerald-700">{message}</p>}
    {error && <p className="text-red-600">{error}</p>}
  </form>;
}
