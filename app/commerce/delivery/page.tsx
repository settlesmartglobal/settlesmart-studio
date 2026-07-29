import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AppShell, Panel } from "../../components/shell";
import { DeliveryForm } from "../../components/forms";

export default async function DeliveryPage() {
  const [companies, zones] = await Promise.all([prisma.company.findMany({ orderBy: { name: "asc" } }), prisma.deliveryZone.findMany({ include: { company: true }, orderBy: { createdAt: "desc" } })]);
  return <AppShell title="Delivery"><div className="grid gap-5 lg:grid-cols-[420px_1fr]"><Panel><DeliveryForm companies={companies} /></Panel><Panel>{zones.map((z) => <div key={z.id} className="border-b border-slate-100 py-3"><b>{z.name}</b><span className="text-sm text-slate-500"> · {z.company.name} · {String(z.radiusKm)} km · {formatMoney(z.deliveryCharge)}</span></div>)}</Panel></div></AppShell>;
}
