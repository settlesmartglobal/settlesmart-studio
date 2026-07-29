import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { appUrl } from "@/modules/wave1/utils";
import { AppShell, Panel } from "../components/shell";
import { QrCodeBox } from "../components/forms";

export default async function CommercePage() {
  const companies = await prisma.company.findMany({ where: { commerceEnabled: true }, orderBy: { name: "asc" } });
  const company = companies[0];
  return <AppShell title="Commerce"><div className="grid gap-5 lg:grid-cols-2"><Panel><h2 className="font-semibold">Commerce setup</h2><div className="mt-4 grid gap-3"><Link href="/commerce/categories" className="rounded-md border border-slate-200 px-4 py-3">Create categories</Link><Link href="/commerce/products" className="rounded-md border border-slate-200 px-4 py-3">Manage products</Link><Link href="/commerce/delivery" className="rounded-md border border-slate-200 px-4 py-3">Configure delivery</Link><Link href="/commerce/operating-hours" className="rounded-md border border-slate-200 px-4 py-3">Operating hours</Link></div></Panel><Panel><h2 className="font-semibold">Ordering URL</h2><div className="mt-4">{company?.orderingSlug ? <QrCodeBox url={`${appUrl()}/order/${company.orderingSlug}`} /> : <p className="text-sm text-slate-500">Enable commerce and set an ordering slug on a company.</p>}</div></Panel></div></AppShell>;
}
