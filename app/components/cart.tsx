"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type CartOption = { id: string; name: string; description?: string | null; priceDelta?: number; price?: number };
type CartItem = { productId: string; lineId: string; name: string; price: number; quantity: number; variantId?: string; variantName?: string; variantDescription?: string | null; addOns?: CartOption[]; instructions?: string };
type CheckoutDetails = {
  customerName: string;
  mobileNumber: string;
  doorOrFlatNumber: string;
  buildingName: string;
  area: string;
  city: string;
  landmark: string;
  deliveryInstructions: string;
  lastSelectedFulfilmentType: string;
};

function key(slug: string) { return `settlesmart-cart-${slug}`; }
function detailsKey(slug: string) { return `settlesmart-checkout-details-${slug}`; }

const areaCityMap: Record<string, string> = {
  "Business Bay": "Dubai",
  "Al Qusais": "Dubai",
  Deira: "Dubai",
  "Bur Dubai": "Dubai",
  Karama: "Dubai",
  JLT: "Dubai",
  "Dubai Marina": "Dubai",
  "Al Barsha": "Dubai",
};

const emptyDetails: CheckoutDetails = {
  customerName: "",
  mobileNumber: "",
  doorOrFlatNumber: "",
  buildingName: "",
  area: "",
  city: "",
  landmark: "",
  deliveryInstructions: "",
  lastSelectedFulfilmentType: "DELIVERY",
};

export function AddToCart({ slug, item, variants = [], addOnGroups = [], disabled = false }: { slug: string; item: Omit<CartItem, "quantity" | "lineId">; variants?: CartOption[]; addOnGroups?: Array<{ id: string; name: string; minSelect: number; maxSelect: number; addOns: CartOption[] }>; disabled?: boolean }) {
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const meaningfulVariants = variants.length > 1;
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? variants[0];
  const selectedAddOns = addOnGroups.flatMap((group) => group.addOns).filter((addOn) => addOnIds.includes(addOn.id));
  const basePrice = selectedVariant?.price ?? item.price + Number(selectedVariant?.priceDelta ?? 0);
  const price = basePrice + selectedAddOns.reduce((sum, addOn) => sum + Number(addOn.price ?? 0), 0);
  function toggleAddOn(group: { maxSelect: number; addOns: CartOption[] }, id: string, checked: boolean) {
    setAddOnIds((current) => {
      const groupIds = group.addOns.map((addOn) => addOn.id);
      if (group.maxSelect === 1) return checked ? [...current.filter((value) => !groupIds.includes(value)), id] : current.filter((value) => value !== id);
      if (!checked) return current.filter((value) => value !== id);
      const selectedInGroup = current.filter((value) => groupIds.includes(value));
      if (selectedInGroup.length >= group.maxSelect) return current;
      return [...current, id];
    });
  }
  return <div className="mt-3 space-y-3"><p className="text-lg font-semibold">AED {basePrice.toFixed(2)}</p>{meaningfulVariants && <select disabled={disabled} value={variantId} onChange={(event) => setVariantId(event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100">{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.description ? ` - ${variant.description}` : ""} - AED {Number(variant.price ?? item.price + Number(variant.priceDelta ?? 0)).toFixed(2)}</option>)}</select>}{addOnGroups.map((group) => <fieldset key={group.id} disabled={disabled} className="rounded-md border border-slate-200 p-3 text-sm disabled:opacity-60"><legend className="px-1 font-semibold">{group.name}{group.minSelect ? ` · choose ${group.minSelect}` : ""}</legend><div className="mt-2 grid gap-2">{group.addOns.map((addOn) => <label key={addOn.id} className="flex items-center gap-2"><input type={group.maxSelect === 1 ? "radio" : "checkbox"} name={`addon-${item.productId}-${group.id}`} checked={addOnIds.includes(addOn.id)} onChange={(event) => toggleAddOn(group, addOn.id, event.target.checked)} />{addOn.name} {Number(addOn.price ?? 0) ? `+ AED ${Number(addOn.price).toFixed(2)}` : ""}</label>)}</div></fieldset>)}{(meaningfulVariants || addOnGroups.length > 0) && <textarea disabled={disabled} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Item instructions optional" className="min-h-16 w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100" />}<button disabled={disabled} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600" onClick={() => { if (disabled) return; setError(""); for (const group of addOnGroups) { const selectedCount = addOnIds.filter((id) => group.addOns.some((addOn) => addOn.id === id)).length; if (selectedCount < group.minSelect || selectedCount > group.maxSelect) { setError(`Choose ${group.minSelect}-${group.maxSelect} options for ${group.name}`); return; } } const current = JSON.parse(sessionStorage.getItem(key(slug)) || "[]") as CartItem[]; const lineId = [item.productId, selectedVariant?.id || "standard", [...addOnIds].sort().join(","), instructions.trim()].join("|"); const found = current.find((x) => x.lineId === lineId); if (found) found.quantity += 1; else current.push({ ...item, lineId, price, quantity: 1, variantId: selectedVariant?.id, variantName: selectedVariant?.name, variantDescription: selectedVariant?.description, addOns: selectedAddOns, instructions: instructions.trim() || undefined }); sessionStorage.setItem(key(slug), JSON.stringify(current)); setAdded(true); }}>{disabled ? "Unavailable" : added ? "Added" : `Add AED ${price.toFixed(2)}`}</button>{error && <p className="text-sm text-red-600">{error}</p>}</div>;
}

export function CartView({ slug }: { slug: string }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(sessionStorage.getItem(key(slug)) || "[]");
  });
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  function save(next: CartItem[]) { setItems(next); sessionStorage.setItem(key(slug), JSON.stringify(next)); }
  if (items.length === 0) return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-semibold">Your cart is empty</h2><Link href={`/order/${slug}`} className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Browse menu</Link></div>;
  return <div className="space-y-4">{items.map((item) => <div key={item.lineId ?? item.productId} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3"><div><b>{item.name}</b>{item.variantName && <div className="text-xs text-slate-500">{item.variantName}{item.variantDescription ? ` - ${item.variantDescription}` : ""}</div>}{item.addOns?.length ? <div className="text-xs text-slate-500">{item.addOns.map((addOn) => addOn.name).join(", ")}</div> : null}{item.instructions && <div className="text-xs text-slate-500">{item.instructions}</div>}<div className="text-sm text-slate-500">AED {item.price.toFixed(2)} · AED {(item.price * item.quantity).toFixed(2)}</div></div><div className="flex items-center gap-2"><button aria-label={`Decrease ${item.name}`} className="grid size-9 place-items-center rounded-md border border-slate-200 font-semibold" onClick={() => save(item.quantity === 1 ? items.filter((x) => (x.lineId ?? x.productId) !== (item.lineId ?? item.productId)) : items.map((x) => (x.lineId ?? x.productId) === (item.lineId ?? item.productId) ? { ...x, quantity: x.quantity - 1 } : x))}>-</button><span className="grid h-9 min-w-10 place-items-center rounded-md bg-slate-100 px-3 text-sm font-semibold">{item.quantity}</span><button aria-label={`Increase ${item.name}`} className="grid size-9 place-items-center rounded-md border border-slate-200 font-semibold" onClick={() => save(items.map((x) => (x.lineId ?? x.productId) === (item.lineId ?? item.productId) ? { ...x, quantity: x.quantity + 1 } : x))}>+</button><button className="rounded-md px-3 py-2 text-sm font-semibold text-red-600" onClick={() => save(items.filter((x) => (x.lineId ?? x.productId) !== (item.lineId ?? item.productId)))}>Remove</button></div></div>)}<div className="text-right text-lg font-semibold">Total AED {total.toFixed(2)}</div><Link href={`/order/${slug}/checkout`} className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Checkout</Link></div>;
}

export function CheckoutForm({ slug }: { slug: string }) {
  const [error, setError] = useState("");
  const [details, setDetails] = useState<CheckoutDetails>(() => {
    if (typeof window === "undefined") return emptyDetails;
    const stored = localStorage.getItem(detailsKey(slug));
    return stored ? { ...emptyDetails, ...JSON.parse(stored) } : emptyDetails;
  });
  function update(name: keyof CheckoutDetails, value: string) {
    setDetails((current) => {
      const next = { ...current, [name]: value };
      if (name === "area") next.city = areaCityMap[value] ?? "";
      return next;
    });
  }
  return <form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); setError(""); const form = Object.fromEntries(new FormData(event.currentTarget)); const items = JSON.parse(sessionStorage.getItem(key(slug)) || "[]") as CartItem[]; const idempotencyKey = sessionStorage.getItem(`${key(slug)}-checkout`) || crypto.randomUUID(); sessionStorage.setItem(`${key(slug)}-checkout`, idempotencyKey); const address = { doorOrFlatNumber: form.doorOrFlatNumber, buildingName: form.buildingName, area: form.area, city: form.city, landmark: form.landmark, latitude: form.latitude, longitude: form.longitude, deliveryInstructions: form.deliveryInstructions }; const response = await fetch("/api/public/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderingSlug: slug, customer: { name: form.customerName, mobile: form.mobileNumber, email: form.email, marketingConsent: Boolean(form.marketingConsent), whatsappOperationalConsent: Boolean(form.whatsappOperationalConsent) }, address, fulfilmentType: form.fulfilmentType, paymentMethod: form.paymentMethod, promotionCode: form.promotionCode, idempotencyKey, specialInstructions: form.deliveryInstructions, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, variantId: i.variantId, addOnIds: i.addOns?.map((addOn) => addOn.id) ?? [], instructions: i.instructions })) }) }); const json = await response.json(); if (!response.ok) { setError(json.error ?? "Checkout failed"); return; } const nextDetails = { customerName: String(form.customerName || details.customerName), mobileNumber: String(form.mobileNumber || details.mobileNumber), doorOrFlatNumber: String(form.doorOrFlatNumber || details.doorOrFlatNumber), buildingName: String(form.buildingName || details.buildingName), area: String(form.area || details.area), city: String(form.city || details.city), landmark: String(form.landmark || details.landmark), deliveryInstructions: String(form.deliveryInstructions || details.deliveryInstructions), lastSelectedFulfilmentType: String(form.fulfilmentType || details.lastSelectedFulfilmentType) }; localStorage.setItem(detailsKey(slug), JSON.stringify(nextDetails)); sessionStorage.removeItem(key(slug)); sessionStorage.removeItem(`${key(slug)}-checkout`); location.href = `/order/${slug}/confirmation/${json.orderNumber}?token=${json.trackingToken}`; }}>
    {(details.customerName || details.mobileNumber) && <button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={() => setDetails(emptyDetails)}>Use different details</button>}
    <input name="customerName" required placeholder="Customer name" value={details.customerName} onChange={(event) => update("customerName", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="mobileNumber" required placeholder="Mobile number" value={details.mobileNumber} onChange={(event) => update("mobileNumber", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="email" placeholder="Email optional" className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="doorOrFlatNumber" required placeholder="Door / Flat No." value={details.doorOrFlatNumber} onChange={(event) => update("doorOrFlatNumber", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
    <input name="buildingName" required placeholder="Building Name" value={details.buildingName} onChange={(event) => update("buildingName", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
    <select name="area" required value={details.area} onChange={(event) => update("area", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2"><option value="">Select Area</option>{Object.keys(areaCityMap).map((area) => <option key={area} value={area}>{area}</option>)}</select>
    <input name="city" required readOnly placeholder="City" value={details.city} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2" />
    <input name="landmark" placeholder="Landmark optional" value={details.landmark} onChange={(event) => update("landmark", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
    <textarea name="deliveryInstructions" placeholder="Delivery Instructions optional" value={details.deliveryInstructions} onChange={(event) => update("deliveryInstructions", event.target.value)} className="min-h-24 rounded-md border border-slate-200 px-3 py-2" />
    <div className="grid grid-cols-2 gap-3"><input name="latitude" placeholder="Latitude optional" className="rounded-md border border-slate-200 px-3 py-2" /><input name="longitude" placeholder="Longitude optional" className="rounded-md border border-slate-200 px-3 py-2" /></div>
    <button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm" onClick={(event) => navigator.geolocation?.getCurrentPosition((pos) => { const form = event.currentTarget.form; if (!form) return; (form.elements.namedItem("latitude") as HTMLInputElement).value = String(pos.coords.latitude); (form.elements.namedItem("longitude") as HTMLInputElement).value = String(pos.coords.longitude); })}>Use current location</button>
    <input name="promotionCode" placeholder="Promotion code optional" className="rounded-md border border-slate-200 px-3 py-2" />
    <select name="fulfilmentType" value={details.lastSelectedFulfilmentType} onChange={(event) => update("lastSelectedFulfilmentType", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2"><option>DELIVERY</option><option>PICKUP</option></select>
    <select name="paymentMethod" className="rounded-md border border-slate-200 px-3 py-2"><option>CASH_ON_DELIVERY</option><option>CARD_ON_DELIVERY</option><option>CASH_ON_PICKUP</option><option>CARD_ON_PICKUP</option><option>ONLINE</option><option>PICKUP_PAYMENT</option></select>
    <label className="flex gap-2 text-sm"><input name="whatsappOperationalConsent" type="checkbox" />Send me order and delivery updates on WhatsApp.</label>
    <label className="flex gap-2 text-sm"><input name="marketingConsent" type="checkbox" />Marketing consent</label>
    <button className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Place order</button>{error && <p className="text-sm text-red-600">{error}</p>}
  </form>;
}
