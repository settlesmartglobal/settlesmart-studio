import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AddToCart } from "../../../../components/cart";
import { AssetImage } from "../../../../components/asset-image";
import { customerAvailability } from "@/modules/wave1/inventory";
import { hasMeaningfulVariants, variantSellingPrice } from "@/modules/wave1/variants";
import { isAddOnCompatibleWithProduct } from "@/modules/wave1/commerce-rules";

export default async function ProductDetailPage({ params }: { params: Promise<{ orderingSlug: string; productSlug: string }> }) {
  const { orderingSlug, productSlug } = await params;
  const company = await prisma.company.findFirst({ where: { orderingSlug, commerceEnabled: true }, include: { brandProfile: true } });
  if (!company) notFound();
  const product = await prisma.product.findFirst({ where: { companyId: company.id, slug: productSlug }, include: { variants: { where: { active: true }, orderBy: { displayOrder: "asc" } }, addOnGroups: { include: { group: { include: { addOns: { where: { active: true }, orderBy: { displayOrder: "asc" } } } } } } } });
  if (!product) notFound();
  const price = Number(product.promotionalPrice ?? product.regularPrice);
  const state = customerAvailability(product);
  const compatibleAddOnGroups = product.addOnGroups.map(({ group }) => ({ ...group, addOns: group.addOns.filter((addOn) => isAddOnCompatibleWithProduct(product, addOn)) })).filter((group) => group.addOns.length > 0);
  return <main className="min-h-screen bg-[#f7f3ed] px-4 py-6 text-slate-950"><div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><AssetImage src={product.imagePath} alt={product.name} className="aspect-[4/3] w-full object-cover sm:aspect-video" /><div className="p-5 sm:p-6"><Link href={`/order/${orderingSlug}`} className="text-sm font-semibold text-emerald-700">Back to menu</Link><div className="mt-4 flex flex-wrap items-start gap-2"><h1 className="mr-auto text-3xl font-semibold">{product.name}</h1>{product.bestseller && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Bestseller</span>}{product.vegetarian && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Veg</span>}</div><p className="mt-3 text-slate-600">{product.description ?? product.shortDescription}</p>{!hasMeaningfulVariants(product.variants) && <p className="mt-4 text-xl font-semibold">{formatMoney(price)}</p>}<p className={`mt-2 text-sm font-semibold ${state === "AVAILABLE" ? "text-emerald-700" : "text-amber-700"}`}>{state === "SOLD_OUT" ? "Sold Out" : state === "UNAVAILABLE" ? "Unavailable" : "Available"}</p>{hasMeaningfulVariants(product.variants) && <div className="mt-5 rounded-md bg-slate-50 p-4"><h2 className="font-semibold">Choose size / serving</h2><div className="mt-3 grid gap-2">{product.variants.map((variant) => <div key={variant.id} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><div><b>{variant.name}</b>{variant.description && <p className="text-slate-500">{variant.description}</p>}</div><span className="font-semibold">{formatMoney(variantSellingPrice(product, variant))}</span></div>)}</div></div>}<AddToCart disabled={state !== "AVAILABLE"} slug={orderingSlug} item={{ productId: product.id, name: product.name, price }} variants={product.variants.map((variant) => ({ id: variant.id, name: variant.name, description: variant.description, price: variantSellingPrice(product, variant), priceDelta: Number(variant.priceDelta) }))} addOnGroups={compatibleAddOnGroups.map((group) => ({ id: group.id, name: group.name, minSelect: group.minSelections, maxSelect: group.maxSelections, addOns: group.addOns.map((addOn) => ({ id: addOn.id, name: addOn.name, price: Number(addOn.price) })) }))} /></div></div></main>;
}
