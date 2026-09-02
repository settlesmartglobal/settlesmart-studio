import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { CartView } from "../../../components/cart";

export default async function CartPage({ params }: { params: Promise<{ orderingSlug: string }> }) {
  const { orderingSlug } = await params;
  const company = await prisma.company.findFirst({ where: { orderingSlug, commerceEnabled: true, status: "ACTIVE" }, select: { currencyCode: true } });
  if (!company) notFound();
  return <main className="min-h-screen bg-[#f7f3ed] px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><Link href={`/order/${orderingSlug}`} className="text-sm font-semibold text-emerald-700">Back to menu</Link><h1 className="mt-4 text-3xl font-semibold">Your Cart</h1><p className="mt-1 text-sm text-slate-500">Review your items before checkout.</p><div className="mt-5"><CartView slug={orderingSlug} currencyCode={company.currencyCode} /></div></div></main>;
}
