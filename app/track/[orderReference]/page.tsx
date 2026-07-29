import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";

export default async function PublicTrackPage({ params, searchParams }: { params: Promise<{ orderReference: string }>; searchParams: Promise<{ token?: string }> }) {
  const { orderReference } = await params;
  const { token } = await searchParams;
  const order = await prisma.order.findFirst({
    where: { orderNumber: orderReference, trackingToken: token ?? "" },
    include: { company: true, items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">{order.company.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">{order.orderNumber}</h1>
        <p className="mt-2 text-lg font-semibold">{order.status.replaceAll("_", " ")}</p>
        <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm">
          <p>{order.fulfilmentType} · {order.paymentMethod}</p>
          <p className="mt-1">Total AED {Number(order.totalAmount).toFixed(2)}</p>
        </div>
        <section className="mt-5">
          <h2 className="font-semibold">Items</h2>
          {order.items.map((item) => <p key={item.id} className="mt-2 text-sm">{item.quantity}x {item.productNameSnapshot}</p>)}
        </section>
        <section className="mt-5 space-y-2">
          <h2 className="font-semibold">Timeline</h2>
          {order.statusHistory.map((history) => <div key={history.id} className="rounded-md border border-slate-200 p-3 text-sm"><b>{history.newStatus.replaceAll("_", " ")}</b><p className="text-slate-500">{history.createdAt.toLocaleString()}</p></div>)}
        </section>
      </div>
    </main>
  );
}
