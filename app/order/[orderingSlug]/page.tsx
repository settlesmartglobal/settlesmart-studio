import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AddToCart } from "../../components/cart";
import { AssetImage } from "../../components/asset-image";
import { normalizePublicAssetPath } from "@/modules/wave1/assets";

export default async function OrderMenuPage({ params }: { params: Promise<{ orderingSlug: string }> }) {
  const { orderingSlug } = await params;
  const now = new Date();
  const company = await prisma.company.findFirst({
    where: { orderingSlug, commerceEnabled: true, status: "ACTIVE" },
    include: {
      brandProfile: true,
      mediaPlacements: {
        where: { active: true, mediaAsset: { approvalStatus: "APPROVED" }, OR: [{ startDate: null }, { startDate: { lte: now } }], AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }] },
        include: { mediaAsset: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      },
      productCategories: { include: { products: { where: { available: true }, orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } },
    },
  });
  if (!company) notFound();
  const hero = company.mediaPlacements.find((p) => p.placement === "ORDERING_HOMEPAGE_HERO" || p.placement === "ORDERING_PROMOTIONAL_BANNER");
  return <main className="min-h-screen bg-slate-50" style={{ background: company.brandProfile?.backgroundColor ?? "#f8fafc" }}><header className="border-b border-slate-200 bg-white px-4 py-5"><div className="mx-auto flex max-w-5xl items-center justify-between"><div>{company.brandProfile?.logoPath && <AssetImage src={company.brandProfile.logoPath} alt={`${company.name} logo`} className="mb-2 size-12 rounded object-cover" />}<h1 className="text-2xl font-semibold">{company.name}</h1><p className="text-sm text-slate-500">{company.brandProfile?.tagline ?? company.description}</p></div><Link href={`/order/${orderingSlug}/cart`} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Cart</Link></div></header><div className="mx-auto max-w-5xl px-4 py-6">{hero && <Link href={hero.destinationUrl || `/order/${orderingSlug}`} className="mb-6 block overflow-hidden rounded-lg border border-slate-200 bg-white"><AssetImage src={hero.mediaAsset.filePath} alt={hero.cta ?? hero.mediaAsset.title} className="aspect-[3/1] max-h-96 w-full object-cover" /><div className="p-4 font-semibold">{hero.cta ?? "Order now"}</div></Link>}{company.mediaPlacements.filter((p) => p.placement === "ORDERING_SPECIAL_OFFER").map((p) => <Link key={p.id} href={p.destinationUrl || `/order/${orderingSlug}`} className="mb-4 block rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{p.cta ?? p.mediaAsset.title}</Link>)}{company.productCategories.map((cat) => <section key={cat.id} className="mb-8">{cat.imagePath && <AssetImage src={cat.imagePath} alt={`${cat.name} category`} className="mb-3 aspect-[5/1] w-full rounded-md object-cover" />}<h2 className="mb-3 text-lg font-semibold">{cat.name}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cat.products.map((p) => { const placement = company.mediaPlacements.find((m) => m.placement === "ORDERING_PRODUCT_IMAGE" && (m.productId === p.id || m.linkedTargetId === p.id)); const image = normalizePublicAssetPath(placement?.mediaAsset.filePath ?? p.imagePath); return <article key={p.id} className="rounded-lg border border-slate-200 bg-white p-4"><AssetImage src={image} alt={p.name} className="mb-3 aspect-video w-full rounded-md object-cover" /><Link href={`/order/${orderingSlug}/product/${p.slug}`} className="font-semibold">{p.name}</Link><p className="mt-1 text-sm text-slate-500">{p.shortDescription}</p><p className="mt-3 font-semibold">{p.promotionalPrice ? formatMoney(p.promotionalPrice) : formatMoney(p.regularPrice)}</p><AddToCart slug={orderingSlug} item={{ productId: p.id, name: p.name, price: Number(p.promotionalPrice ?? p.regularPrice) }} /></article>; })}</div></section>)}{company.whatsapp && <a href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`} className="text-sm font-semibold text-emerald-700">Contact on WhatsApp</a>}</div></main>;
}
