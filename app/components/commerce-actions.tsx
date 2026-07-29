"use client";

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

export function ProductEditForm({ product, categories }: { product: Record<string, unknown>; categories: Array<{ id: string; name: string }> }) {
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
    try {
      await jsonRequest(`/api/commerce/products/${product.id}`, { action: "UPDATE", product: values }, "PATCH");
      setMessage("Product updated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product update failed");
    }
  }}><label className="grid gap-1 text-sm font-medium">Name<input name="name" defaultValue={String(product.name ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Slug<input name="slug" defaultValue={String(product.slug ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Category<select name="categoryId" defaultValue={String(product.categoryId ?? "")} className="rounded-md border border-slate-200 px-3 py-2"><option value="">Unassigned</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Image path<input name="imagePath" defaultValue={String(product.imagePath ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium md:col-span-2">Short description<input name="shortDescription" defaultValue={String(product.shortDescription ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium md:col-span-2">Description<textarea name="description" defaultValue={String(product.description ?? "")} className="min-h-24 rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Regular price<input name="regularPrice" type="number" step="0.01" defaultValue={String(product.regularPrice ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Promotional price<input name="promotionalPrice" type="number" step="0.01" defaultValue={String(product.promotionalPrice ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Preparation minutes<input name="preparationMinutes" type="number" defaultValue={String(product.preparationMinutes ?? "")} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Display order<input name="displayOrder" type="number" defaultValue={String(product.displayOrder ?? 0)} className="rounded-md border border-slate-200 px-3 py-2" /></label><label className="flex items-center gap-2 text-sm"><input name="vegetarian" type="checkbox" defaultChecked={Boolean(product.vegetarian)} />Vegetarian</label><label className="flex items-center gap-2 text-sm"><input name="available" type="checkbox" defaultChecked={Boolean(product.available)} />Active</label><label className="flex items-center gap-2 text-sm"><input name="featured" type="checkbox" defaultChecked={Boolean(product.featured)} />Featured</label><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save product</button>{message && <p className="text-sm text-emerald-700">{message}</p>}{error && <p className="text-sm text-red-600">{error}</p>}</form>;
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
