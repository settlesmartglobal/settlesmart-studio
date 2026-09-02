import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatCommerceMoney } from "@/modules/wave1/utils";
import { StickyCartSummary } from "../../components/cart";
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
  const coverImage = normalizePublicAssetPath(hero?.mediaAsset.filePath ?? company.commerceSettings?.coverImagePath);
  const businessName = company.commerceSettings?.displayName ?? company.name;
  return (
    <main className="min-h-screen bg-[#f7f3ed] pb-20 text-slate-950" style={{ background: company.brandProfile?.backgroundColor ?? "#f7f3ed" }}>
      <OfflineNotice />
      <header className="bg-white/95 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href={`/order/${orderingSlug}`} className="flex min-w-0 items-center gap-3">
            {company.brandProfile?.logoPath && <AssetImage src={company.brandProfile.logoPath} alt={`${company.name} logo`} className="size-11 shrink-0 rounded-md object-cover" />}
            <div className="min-w-0">
              <p className="truncate font-semibold">{businessName}</p>
              <p className="text-xs text-slate-500">Digital ordering</p>
            </div>
          </Link>
          <div className="flex shrink-0 flex-wrap justify-end gap-2"><StorefrontActions businessName={businessName} storeUrl={storeUrl} /><Link href={`/order/${orderingSlug}/cart`} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Cart</Link></div>
        </div>
      </header>
      <section className="relative overflow-hidden bg-slate-950">
        {coverImage && <AssetImage src={coverImage} alt={`${businessName} cover`} className="absolute inset-0 h-full w-full object-cover opacity-55" />}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/55 to-slate-950/85" />
        <div className="relative mx-auto grid min-h-[320px] max-w-6xl content-end gap-5 px-4 py-8 text-white sm:min-h-[380px]">
          <div className="max-w-3xl">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${open ? "bg-emerald-500/95 text-white" : "bg-amber-400 text-slate-950"}`}><span className="size-2 rounded-full bg-current" />{open ? "Open for orders" : company.branches[0]?.closureReason ?? company.commerceSettings?.temporaryClosureMessage ?? "Currently closed"}</div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{businessName}</h1>
            <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">{company.commerceSettings?.description ?? company.brandProfile?.tagline ?? company.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-semibold text-white/95"><span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">Delivery {company.commerceSettings?.deliveryEnabled ? "available" : "closed"}</span><span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">Pickup {company.commerceSettings?.pickupEnabled ? "available" : "closed"}</span>{company.commerceSettings?.preparationMinutes && <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">Prep {company.commerceSettings.preparationMinutes} min</span>}</div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <form className="mb-4 flex gap-2 rounded-lg bg-white p-2 shadow-sm"><input aria-label="Search menu" name="q" defaultValue={q} placeholder="Search dishes..." className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-3" /><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Search</button></form>
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1"><Link href={`/order/${orderingSlug}`} className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">All</Link>{company.productCategories.map((cat) => <a key={cat.id} href={`#${cat.slug}`} className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">{cat.name}</a>)}</nav>
        {company.mediaPlacements.filter((p) => p.placement === "ORDERING_SPECIAL_OFFER").map((p) => <Link key={p.id} href={p.destinationUrl || `/order/${orderingSlug}`} className="mb-4 block rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{p.cta ?? p.mediaAsset.title}</Link>)}
        {company.productCategories.map((cat) => {
          const products = cat.products.filter((p) => !query || `${p.name} ${p.shortDescription ?? ""} ${p.description ?? ""}`.toLowerCase().includes(query));
          if (!products.length) return null;
          return (
            <section key={cat.id} className="mb-8">
              {cat.imagePath && !cat.imagePath.includes("commerce-placeholder") && <AssetImage src={cat.imagePath} alt={`${cat.name} category`} className="mb-3 max-h-40 w-full rounded-md object-cover" />}
              <h2 id={cat.slug} className="mb-3 scroll-mt-24 text-xl font-semibold">{cat.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => {
                  const placement = company.mediaPlacements.find((m) => m.placement === "ORDERING_PRODUCT_IMAGE" && (m.productId === p.id || m.linkedTargetId === p.id));
                  const image = normalizePublicAssetPath(placement?.mediaAsset.filePath ?? p.imagePath);
                  const state = customerAvailability(p);
                  const variantPrices = p.variants.map((variant) => variantSellingPrice(p, variant));
                  const fromPrice = variantPrices.length ? Math.min(...variantPrices) : Number(p.promotionalPrice ?? p.regularPrice);
                  return (
                    <article key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <AssetImage src={image} alt={`${p.name} product image`} className="h-40 w-full object-cover" />
                      <div className="flex min-h-64 flex-col p-4">
                        <div className="flex items-start gap-2"><Link href={`/order/${orderingSlug}/product/${p.slug}`} className="mr-auto text-lg font-semibold">{p.name}</Link>{p.bestseller && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Bestseller</span>}{p.vegetarian && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Veg</span>}</div>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{p.shortDescription}</p>
                        <div className="mt-3 flex items-center justify-between gap-3"><p className="font-semibold">{hasMeaningfulVariants(p.variants) ? `From ${formatCommerceMoney(fromPrice, company.currencyCode)}` : formatCommerceMoney(fromPrice, company.currencyCode)}</p><p className={`text-sm font-semibold ${state === "AVAILABLE" ? "text-emerald-700" : "text-amber-700"}`}>{state === "SOLD_OUT" ? "Sold Out" : state === "UNAVAILABLE" ? "Unavailable" : "Available"}</p></div>
                        <Link href={`/order/${orderingSlug}/product/${p.slug}`} className={`mt-auto inline-flex w-full justify-center rounded-md px-4 py-3 text-sm font-semibold ${state === "AVAILABLE" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>{state === "AVAILABLE" ? (hasMeaningfulVariants(p.variants) || p.addOnGroups.length ? "Customize" : "Add") : state === "SOLD_OUT" ? "Sold Out" : "Unavailable"}</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        <footer className="mt-10 border-t border-slate-200 py-6 text-center text-sm text-slate-500"><p>Powered by SettleSmart Commerce™</p>{company.phone && <p className="mt-1">{company.phone}</p>}</footer>
      </div>
      <StickyCartSummary slug={orderingSlug} currencyCode={company.currencyCode} />
    </main>
  );
}
