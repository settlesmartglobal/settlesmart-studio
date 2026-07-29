import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";

export default async function RiderDeliveryPage({ params }: { params: Promise<{ secureAccessCode: string }> }) {
  const { secureAccessCode } = await params;
  const rider = await prisma.rider.findUnique({
    where: { secureAccessCode },
    include: {
      company: true,
      orders: {
        where: { status: { in: ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"] } },
        include: { items: true },
        orderBy: { placedAt: "asc" },
        take: 1,
      },
    },
  });
  if (!rider || !rider.active) notFound();
  const order = rider.orders[0];
  const address = order?.deliveryAddressSnapshotJson as { address?: string; area?: string; landmark?: string; deliveryInstructions?: string } | undefined;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <header className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{rider.company.name}</p>
          <h1 className="text-2xl font-semibold">{rider.name}</h1>
          <p className="text-sm text-slate-500">{rider.availabilityStatus} · {rider.vehicleType} {rider.vehicleNumber}</p>
        </header>
        {!order && <section className="rounded-lg bg-white p-6 text-center shadow-sm"><h2 className="font-semibold">No active delivery</h2><p className="mt-2 text-sm text-slate-500">Assigned orders will appear here.</p></section>}
        {order && <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-slate-500">{order.status.replaceAll("_", " ")} · Collect AED {formatMoney(order.totalAmount)}</p>
          <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm">
            <b>{order.customerNameSnapshot}</b>
            <p>{order.customerMobileSnapshot}</p>
            <p className="mt-2">{address?.address}</p>
            <p>{address?.area}</p>
            <p>{address?.landmark}</p>
            <p className="mt-2 text-slate-500">{address?.deliveryInstructions}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`tel:${order.customerMobileSnapshot}`} className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold">Call</a>
            <a href={`https://wa.me/${order.customerMobileSnapshot.replace(/\D/g, "")}`} className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold">WhatsApp</a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address?.address ?? ""} ${address?.area ?? ""}`)}`} className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold">Map</a>
            <span className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold">Payment</span>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            {["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].map((status) => <form key={status} action={`/api/orders/${order.id}`} method="post"><button className="w-full rounded-md bg-slate-950 px-4 py-2 font-semibold text-white">{status.replaceAll("_", " ")}</button></form>)}
          </div>
        </section>}
      </div>
    </main>
  );
}
