import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AddToCart } from "../../../../components/cart";
import { AssetImage } from "../../../../components/asset-image";
import { customerAvailability } from "@/modules/wave1/inventory";
import { hasMeaningfulVariants, variantSellingPrice } from "@/modules/wave1/variants";

export default async function ProductDetailPage({ params }: { params: Promise<{ orderingSlug: string; productSlug: string }> }) {
  const { orderingSlug, productSlug } = await params;
  const company = await prisma.company.findFirst({ where: { orderingSlug, commerceEnabled: true }, include: { brandProfile: true } });
  if (!company) notFound();
  const product = await prisma.product.findFirst({ where: { companyId: company.id, slug: productSlug }, include: { variants: { where: { active: true }, orderBy: { displayOrder: "asc" } }, addOnGroups: { include: { group: { include: { addOns: { where: { active: true }, orderBy: { displayOrder: "asc" } } } } } } } });
  if (!product) notFound();
  const price = Number(product.promotionalPrice ?? product.regularPrice);
  const state = customerAvailability(product);
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6"><Link href={`/order/${orderingSlug}`} className="text-sm text-sky-700">Back to menu</Link><AssetImage src={product.imagePath} alt={product.name} className="mt-5 aspect-video w-full rounded-md object-cover" /><h1 className="mt-5 text-3xl font-semibold">{product.name}</h1><p className="mt-2 text-slate-600">{product.description ?? product.shortDescription}</p>{!hasMeaningfulVariants(product.variants) && <p className="mt-4 text-xl font-semibold">{formatMoney(price)}</p>}<p className={`mt-2 text-sm font-semibold ${state === "AVAILABLE" ? "text-emerald-700" : "text-amber-700"}`}>{state === "SOLD_OUT" ? "Sold Out" : state === "UNAVAILABLE" ? "Unavailable" : "Available"}</p><AddToCart disabled={state !== "AVAILABLE"} slug={orderingSlug} item={{ productId: product.id, name: product.name, price }} variants={product.variants.map((variant) => ({ id: variant.id, name: variant.name, description: variant.description, price: variantSellingPrice(product, variant), priceDelta: Number(variant.priceDelta) }))} addOnGroups={product.addOnGroups.map(({ group }) => ({ id: group.id, name: group.name, minSelect: group.minSelections, maxSelect: group.maxSelections, addOns: group.addOns.map((addOn) => ({ id: addOn.id, name: addOn.name, price: Number(addOn.price) })) }))} /></div></main>;
}
