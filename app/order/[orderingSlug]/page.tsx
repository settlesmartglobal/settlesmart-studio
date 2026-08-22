import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AddToCart } from "../../components/cart";
import { AssetImage } from "../../components/asset-image";
import { normalizePublicAssetPath } from "@/modules/wave1/assets";
import { customerAvailability } from "@/modules/wave1/inventory";
import { hasMeaningfulVariants, variantSellingPrice } from "@/modules/wave1/variants";
import { commerceStoreUrl } from "@/modules/wave1/storefront";
import { StorefrontActions } from "../../components/storefront-actions";
import { OfflineNotice } from "../../components/offline-notice";

function localOpen(hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; closed: boolean }>, timeZone = "Asia/Dubai") {
  if (!hours.length) return true;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(String(parts.find((part) => part.type === "weekday")?.value ?? "Sun"));
  const time = `${parts.find((part) => part.type === "hour")?.value ?? "00"}:${parts.find((part) => part.type === "minute")?.value ?? "00"}`;
  const row = hours.find((hour) => hour.dayOfWeek === dayOfWeek);
  if (!row || row.closed) return false;
  return row.openTime <= row.closeTime ? time >= row.openTime && time <= row.closeTime : time >= row.openTime || time <= row.closeTime;
}

export default async function OrderMenuPage({ params, searchParams }: { params: Promise<{ orderingSlug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { orderingSlug } = await params;
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const now = new Date();
  const company = await prisma.company.findFirst({
    where: { orderingSlug, commerceEnabled: true, status: "ACTIVE" },
    include: {
      brandProfile: true,
      commerceSettings: true,
      branches: { where: { active: true }, include: { hours: true }, take: 1 },
      mediaPlacements: {
        where: { active: true, mediaAsset: { approvalStatus: "APPROVED" }, OR: [{ startDate: null }, { startDate: { lte: now } }], AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }] },
        include: { mediaAsset: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      },
      productCategories: {
        include: {
          products: {
            include: {
              variants: { where: { active: true }, orderBy: { displayOrder: "asc" } },
              addOnGroups: {
                include: {
                  group: {
                    include: {
                      addOns: { where: { active: true }, orderBy: { displayOrder: "asc" } },
                    },
                  },
                },
              },
            },
            orderBy: { displayOrder: "asc" },
          },
        },
        where: { active: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  if (!company) notFound();
  const hero = company.mediaPlacements.find((p) => p.placement === "ORDERING_HOMEPAGE_HERO" || p.placement === "ORDERING_PROMOTIONAL_BANNER");
  const open = Boolean(company.commerceSettings?.acceptingOrders) && !company.branches[0]?.temporarilyClosed && localOpen(company.branches[0]?.hours ?? [], company.commerceSettings?.timezone);
  const storeUrl = commerceStoreUrl(orderingSlug);
  return (
    <main className="min-h-screen bg-slate-50" style={{ background: company.brandProfile?.backgroundColor ?? "#f8fafc" }}>
      <OfflineNotice />
      <header className="border-b border-slate-200 bg-white px-4 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            {company.brandProfile?.logoPath && <AssetImage src={company.brandProfile.logoPath} alt={`${company.name} logo`} className="mb-2 size-12 rounded object-cover" />}
            <h1 className="text-2xl font-semibold">{company.name}</h1>
            <p className="text-sm text-slate-500">{company.brandProfile?.tagline ?? company.description}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2"><StorefrontActions businessName={company.commerceSettings?.displayName ?? company.name} storeUrl={storeUrl} /><Link href={`/order/${orderingSlug}/cart`} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Cart</Link></div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className={`mb-4 rounded-md border p-3 text-sm font-semibold ${open ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{open ? "Open for orders" : company.branches[0]?.closureReason ?? company.commerceSettings?.temporaryClosureMessage ?? "Currently closed"}</div>
        <form className="mb-5 flex gap-2"><input name="q" defaultValue={q} placeholder="Search menu" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2" /><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Search</button></form>
        {hero && <Link href={hero.destinationUrl || `/order/${orderingSlug}`} className="mb-6 block overflow-hidden rounded-lg border border-slate-200 bg-white"><AssetImage src={hero.mediaAsset.filePath} alt={hero.cta ?? hero.mediaAsset.title} className="aspect-[3/1] max-h-96 w-full object-cover" /><div className="p-4 font-semibold">{hero.cta ?? "Order now"}</div></Link>}
        {company.mediaPlacements.filter((p) => p.placement === "ORDERING_SPECIAL_OFFER").map((p) => <Link key={p.id} href={p.destinationUrl || `/order/${orderingSlug}`} className="mb-4 block rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{p.cta ?? p.mediaAsset.title}</Link>)}
        {company.productCategories.map((cat) => {
          const products = cat.products.filter((p) => !query || `${p.name} ${p.shortDescription ?? ""} ${p.description ?? ""}`.toLowerCase().includes(query));
          if (!products.length) return null;
          return (
            <section key={cat.id} className="mb-8">
              {cat.imagePath && !cat.imagePath.includes("commerce-placeholder") && <AssetImage src={cat.imagePath} alt={`${cat.name} category`} className="mb-3 max-h-40 w-full rounded-md object-cover" />}
              <h2 className="mb-3 text-lg font-semibold">{cat.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => {
                  const placement = company.mediaPlacements.find((m) => m.placement === "ORDERING_PRODUCT_IMAGE" && (m.productId === p.id || m.linkedTargetId === p.id));
                  const image = normalizePublicAssetPath(placement?.mediaAsset.filePath ?? p.imagePath);
                  const state = customerAvailability(p);
                  return (
                    <article key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <AssetImage src={image} alt={`${p.name} product image`} className="mb-3 h-32 w-full rounded-md object-cover sm:h-36" />
                      <Link href={`/order/${orderingSlug}/product/${p.slug}`} className="font-semibold">{p.name}</Link>
                      <p className="mt-1 text-sm text-slate-500">{p.shortDescription}</p>
                      {!hasMeaningfulVariants(p.variants) && <p className="mt-3 font-semibold">{p.promotionalPrice ? formatMoney(p.promotionalPrice) : formatMoney(p.regularPrice)}</p>}
                      <p className={`mt-2 text-sm font-semibold ${state === "AVAILABLE" ? "text-emerald-700" : "text-amber-700"}`}>{state === "SOLD_OUT" ? "Sold Out" : state === "UNAVAILABLE" ? "Unavailable" : "Available"}</p>
                      <AddToCart disabled={state !== "AVAILABLE"} slug={orderingSlug} item={{ productId: p.id, name: p.name, price: Number(p.promotionalPrice ?? p.regularPrice) }} variants={p.variants.map((variant) => ({ id: variant.id, name: variant.name, description: variant.description, price: variantSellingPrice(p, variant), priceDelta: Number(variant.priceDelta) }))} addOnGroups={p.addOnGroups.map(({ group }) => ({ id: group.id, name: group.name, minSelect: group.minSelections, maxSelect: group.maxSelections, addOns: group.addOns.map((addOn) => ({ id: addOn.id, name: addOn.name, price: Number(addOn.price) })) }))} />
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        {company.whatsapp && <a href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`} className="text-sm font-semibold text-emerald-700">Contact on WhatsApp</a>}
      </div>
    </main>
  );
}
