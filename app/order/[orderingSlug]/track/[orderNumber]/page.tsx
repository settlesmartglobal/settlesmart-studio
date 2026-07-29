import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import Link from "next/link";
import { LiveRefresh } from "../../../../components/live-refresh";
import { FeedbackForm } from "../../../../components/commerce-actions";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params, searchParams }: { params: Promise<{ orderingSlug: string; orderNumber: string }>; searchParams: Promise<{ token?: string }> }) {
  const { orderingSlug, orderNumber } = await params;
  const { token } = await searchParams;
  const order = await prisma.order.findFirst({ where: { orderNumber, trackingToken: token ?? "", company: { orderingSlug } }, include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } }, company: true } });
  if (!order) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><LiveRefresh /><div className="mx-auto max-w-2xl rounded-lg bg-white p-6"><h1 className="text-2xl font-semibold">Track {order.orderNumber}</h1><p className="mt-2 text-lg font-semibold text-sky-700">{order.status.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-slate-500">{order.company.name} · {order.fulfilmentType} · {order.paymentMethod}</p><div className="mt-3 flex flex-wrap gap-2 text-sm"><Link href={`/order/${orderingSlug}/track/${order.orderNumber}?token=${token}`} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Refresh status</Link><Link href={`/receipt/${order.orderNumber}?token=${token}`} className="rounded-md bg-slate-950 px-3 py-2 font-semibold text-white">Receipt</Link></div><div className="mt-6 rounded-md bg-slate-50 p-4"><h2 className="font-semibold">Items</h2>{order.items.map((item) => <p key={item.id} className="mt-2 text-sm">{item.quantity}x {item.productNameSnapshot}</p>)}<p className="mt-3 font-semibold">Total AED {Number(order.totalAmount).toFixed(2)}</p></div><div className="mt-6 space-y-3">{order.statusHistory.map((h) => <div key={h.id} className="rounded-md border border-slate-200 p-3"><b>{h.newStatus.replaceAll("_", " ")}</b><div className="text-sm text-slate-500">{h.createdAt.toLocaleString()}</div></div>)}</div>{["DELIVERED", "COMPLETED"].includes(order.status) && <FeedbackForm orderNumber={order.orderNumber} token={token ?? ""} />}</div></main>;
}
