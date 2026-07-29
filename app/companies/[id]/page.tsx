import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { appUrl } from "@/modules/wave1/utils";
import { AppShell, Panel } from "../../components/shell";
import { QrCodeBox } from "../../components/forms";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id }, include: { brandProfile: true, products: true, orders: true } });
  if (!company) notFound();
  const url = company.orderingSlug ? `${appUrl()}/order/${company.orderingSlug}` : "Set an ordering slug to generate an ordering link.";
  return <AppShell title={company.name}><div className="grid gap-5 lg:grid-cols-2"><Panel><h2 className="text-lg font-semibold">Profile</h2><dl className="mt-4 grid gap-2 text-sm"><div>Type: {company.businessType}</div><div>Location: {[company.city, company.country].filter(Boolean).join(", ") || "Not set"}</div><div>Commerce: {company.commerceEnabled ? "Enabled" : "Off"}</div><div>Ordering slug: {company.orderingSlug ?? "Not set"}</div></dl><Link href={`/companies/${company.id}/edit`} className="mt-4 inline-flex rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Edit company</Link></Panel><Panel><h2 className="text-lg font-semibold">Ordering URL and QR</h2><div className="mt-4">{company.orderingSlug ? <QrCodeBox url={url} /> : <p className="text-sm text-slate-500">{url}</p>}</div></Panel></div></AppShell>;
}
