"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type CartItem = { productId: string; name: string; price: number; quantity: number };

function key(slug: string) { return `settlesmart-cart-${slug}`; }

export function AddToCart({ slug, item }: { slug: string; item: Omit<CartItem, "quantity"> }) {
  const [added, setAdded] = useState(false);
  return <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => { const current = JSON.parse(sessionStorage.getItem(key(slug)) || "[]") as CartItem[]; const found = current.find((x) => x.productId === item.productId); if (found) found.quantity += 1; else current.push({ ...item, quantity: 1 }); sessionStorage.setItem(key(slug), JSON.stringify(current)); setAdded(true); }}>{added ? "Added" : "Add to cart"}</button>;
}

export function CartView({ slug }: { slug: string }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(sessionStorage.getItem(key(slug)) || "[]");
  });
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  function save(next: CartItem[]) { setItems(next); sessionStorage.setItem(key(slug), JSON.stringify(next)); }
  return <div className="space-y-4">{items.map((item) => <div key={item.productId} className="flex items-center justify-between border-b border-slate-100 py-3"><div><b>{item.name}</b><div className="text-sm text-slate-500">{item.price.toFixed(2)}</div></div><input aria-label={`${item.name} quantity`} type="number" min="1" value={item.quantity} onChange={(e) => save(items.map((x) => x.productId === item.productId ? { ...x, quantity: Number(e.target.value) } : x))} className="w-20 rounded-md border border-slate-200 px-3 py-2" /></div>)}<div className="text-right text-lg font-semibold">Total {total.toFixed(2)}</div><Link href={`/order/${slug}/checkout`} className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Checkout</Link></div>;
}

export function CheckoutForm({ slug }: { slug: string }) {
  const [error, setError] = useState("");
  return <form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); setError(""); const form = Object.fromEntries(new FormData(event.currentTarget)); const items = JSON.parse(sessionStorage.getItem(key(slug)) || "[]") as CartItem[]; const response = await fetch("/api/public/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderingSlug: slug, customer: { name: form.name, mobile: form.mobile, email: form.email, marketingConsent: Boolean(form.marketingConsent) }, address: form, fulfilmentType: form.fulfilmentType, paymentMethod: form.paymentMethod, specialInstructions: form.specialInstructions, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) }) }); const json = await response.json(); if (!response.ok) { setError(json.error ?? "Checkout failed"); return; } sessionStorage.removeItem(key(slug)); location.href = `/order/${slug}/confirmation/${json.orderNumber}`; }}><input name="name" required placeholder="Name" className="rounded-md border border-slate-200 px-3 py-2" /><input name="mobile" required placeholder="Mobile" className="rounded-md border border-slate-200 px-3 py-2" /><input name="email" placeholder="Email optional" className="rounded-md border border-slate-200 px-3 py-2" /><input name="address" placeholder="Address" className="rounded-md border border-slate-200 px-3 py-2" /><input name="building" placeholder="Building" className="rounded-md border border-slate-200 px-3 py-2" /><input name="apartment" placeholder="Apartment" className="rounded-md border border-slate-200 px-3 py-2" /><input name="area" placeholder="Area" className="rounded-md border border-slate-200 px-3 py-2" /><input name="city" placeholder="City" className="rounded-md border border-slate-200 px-3 py-2" /><div className="grid grid-cols-2 gap-3"><input name="latitude" placeholder="Latitude optional" className="rounded-md border border-slate-200 px-3 py-2" /><input name="longitude" placeholder="Longitude optional" className="rounded-md border border-slate-200 px-3 py-2" /></div><button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm" onClick={() => navigator.geolocation?.getCurrentPosition((pos) => { const form = document.querySelector("form") as HTMLFormElement; (form.elements.namedItem("latitude") as HTMLInputElement).value = String(pos.coords.latitude); (form.elements.namedItem("longitude") as HTMLInputElement).value = String(pos.coords.longitude); })}>Use current location</button><textarea name="specialInstructions" placeholder="Order instructions" className="min-h-24 rounded-md border border-slate-200 px-3 py-2" /><select name="fulfilmentType" className="rounded-md border border-slate-200 px-3 py-2"><option>DELIVERY</option><option>PICKUP</option></select><select name="paymentMethod" className="rounded-md border border-slate-200 px-3 py-2"><option>CASH_ON_DELIVERY</option><option>CARD_ON_DELIVERY</option><option>PICKUP_PAYMENT</option></select><label className="flex gap-2 text-sm"><input name="marketingConsent" type="checkbox" />Marketing consent</label><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Place order</button>{error && <p className="text-sm text-red-600">{error}</p>}</form>;
}
