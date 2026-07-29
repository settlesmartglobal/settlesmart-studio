import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";
import { AppShell, Panel } from "../../components/shell";
import { OrderStatusForm } from "../../components/forms";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { company: true, items: true, statusHistory: { orderBy: { createdAt: "asc" } } } });
  if (!order) notFound();
  const mapsUrl = order.customerLatitude && order.customerLongitude ? `https://www.google.com/maps/dir/?api=1&destination=${order.customerLatitude},${order.customerLongitude}` : "";
  return <AppShell title={`Order ${order.orderNumber}`}><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><Panel><OrderStatusForm orderId={order.id} status={order.status} /><h2 className="mt-6 font-semibold">Items</h2>{order.items.map((item) => <div key={item.id} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span>{item.quantity} x {item.productNameSnapshot}</span><span>{formatMoney(item.lineTotal)}</span></div>)}<div className="mt-4 text-right font-semibold">Total {formatMoney(order.totalAmount)}</div></Panel><Panel><h2 className="font-semibold">Customer and delivery</h2><div className="mt-3 space-y-2 text-sm text-slate-600"><p>{order.customerNameSnapshot}</p><p>{order.customerMobileSnapshot}</p><p>{JSON.stringify(order.deliveryAddressSnapshotJson ?? {})}</p>{mapsUrl && <a href={mapsUrl} className="text-sky-700" target="_blank">Open Google Maps navigation</a>}</div><h3 className="mt-6 font-semibold">Timeline</h3>{order.statusHistory.map((h) => <div key={h.id} className="mt-3 text-sm"><b>{h.newStatus}</b><div className="text-slate-500">{h.note ?? ""}</div></div>)}</Panel></div></AppShell>;
}
