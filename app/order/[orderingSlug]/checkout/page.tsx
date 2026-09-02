import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { CheckoutForm } from "../../../components/cart";

export default async function CheckoutPage({ params }: { params: Promise<{ orderingSlug: string }> }) {
  const { orderingSlug } = await params;
  const company = await prisma.company.findFirst({
    where: { orderingSlug, commerceEnabled: true, status: "ACTIVE" },
    include: {
      commerceSettings: true,
      deliveryZones: { where: { active: true }, orderBy: [{ radiusKm: "asc" }, { name: "asc" }] },
      branches: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!company) notFound();
  const branch = company.branches[0];
  const merchantLocation = {
    country: company.country ?? branch?.country ?? "",
    region: company.region ?? branch?.region ?? "",
    city: company.city ?? branch?.city ?? "",
    postalCode: company.postalCode ?? branch?.postalCode ?? "",
    latitude: company.latitude == null ? (branch?.latitude == null ? null : Number(branch.latitude)) : Number(company.latitude),
    longitude: company.longitude == null ? (branch?.longitude == null ? null : Number(branch.longitude)) : Number(company.longitude),
    deliveryRadiusKm: Number(branch?.deliveryRadiusKm ?? company.commerceSettings?.deliveryRadiusKm ?? 0),
    serviceAreas: company.deliveryZones.map((zone) => ({ name: zone.name, radiusKm: Number(zone.radiusKm) })),
  };
  return <main className="min-h-screen bg-[#f7f3ed] px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><Link href={`/order/${orderingSlug}/cart`} className="text-sm font-semibold text-emerald-700">Back to cart</Link><h1 className="mt-4 text-3xl font-semibold">Checkout</h1><p className="mb-5 mt-1 text-sm text-slate-500">Choose delivery or pickup, confirm your details, and place your order.</p><CheckoutForm slug={orderingSlug} merchantLocation={merchantLocation} /></div></main>;
}
