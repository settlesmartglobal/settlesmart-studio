import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";

export default async function TrackPage({ params }: { params: Promise<{ orderingSlug: string; orderNumber: string }> }) {
  const { orderingSlug, orderNumber } = await params;
  const order = await prisma.order.findFirst({ where: { orderNumber, company: { orderingSlug } }, include: { statusHistory: { orderBy: { createdAt: "asc" } }, company: true } });
  if (!order) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6"><h1 className="text-2xl font-semibold">Track {order.orderNumber}</h1><p className="mt-2 text-lg font-semibold text-sky-700">{order.status}</p><div className="mt-6 space-y-3">{order.statusHistory.map((h) => <div key={h.id} className="rounded-md border border-slate-200 p-3"><b>{h.newStatus}</b><div className="text-sm text-slate-500">{h.createdAt.toLocaleString()}</div></div>)}</div></div></main>;
}
