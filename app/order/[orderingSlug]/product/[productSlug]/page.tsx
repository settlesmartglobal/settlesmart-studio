import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AddToCart } from "../../../../components/cart";

export default async function ProductDetailPage({ params }: { params: Promise<{ orderingSlug: string; productSlug: string }> }) {
  const { orderingSlug, productSlug } = await params;
  const company = await prisma.company.findFirst({ where: { orderingSlug, commerceEnabled: true }, include: { brandProfile: true } });
  if (!company) notFound();
  const product = await prisma.product.findFirst({ where: { companyId: company.id, slug: productSlug, available: true } });
  if (!product) notFound();
  const price = Number(product.promotionalPrice ?? product.regularPrice);
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6"><Link href={`/order/${orderingSlug}`} className="text-sm text-sky-700">Back to menu</Link>{product.imagePath && <img src={product.imagePath} alt="" className="mt-5 aspect-video w-full rounded-md object-cover" />}<h1 className="mt-5 text-3xl font-semibold">{product.name}</h1><p className="mt-2 text-slate-600">{product.description ?? product.shortDescription}</p><p className="mt-4 text-xl font-semibold">{formatMoney(price)}</p><AddToCart slug={orderingSlug} item={{ productId: product.id, name: product.name, price }} /></div></main>;
}
