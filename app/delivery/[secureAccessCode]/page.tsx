import { notFound } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/core/database/prisma";
import { formatCommerceMoney } from "@/modules/wave1/utils";
import { RiderMobileActions } from "../../components/order-actions";
import { whatsappLink } from "@/modules/wave1/notifications";

const activeDeliveryStatuses: OrderStatus[] = ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"];
const riderVisibleStatuses: OrderStatus[] = [...activeDeliveryStatuses, "DELIVERED"];

export default async function RiderDeliveryPage({ params }: { params: Promise<{ secureAccessCode: string }> }) {
  const { secureAccessCode } = await params;
  const rider = await prisma.rider.findUnique({
    where: { secureAccessCode },
    include: {
      company: true,
    },
  });
  if (!rider || !rider.active) notFound();
  const order = rider.currentOrderId
    ? await prisma.order.findFirst({
        where: { id: rider.currentOrderId, companyId: rider.companyId, riderId: rider.id, status: { in: activeDeliveryStatuses } },
        include: { items: true },
      })
    : await prisma.order.findFirst({
        where: { companyId: rider.companyId, riderId: rider.id, status: { in: riderVisibleStatuses } },
        include: { items: true },
        orderBy: { deliveredAt: "desc" },
      });
  const address = order?.deliveryAddressSnapshotJson as { doorOrFlatNumber?: string; buildingName?: string; area?: string; city?: string; landmark?: string; deliveryInstructions?: string; latitude?: string; longitude?: string } | undefined;
  const canSeeCustomerPii = Boolean(order && activeDeliveryStatuses.includes(order.status) && order.riderId === rider.id && order.companyId === rider.companyId);
  const latitude = order?.customerLatitude ?? address?.latitude;
  const longitude = order?.customerLongitude ?? address?.longitude;
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
          <p className="mt-1 text-sm text-slate-500">{order.status.replaceAll("_", " ")}{canSeeCustomerPii ? ` · Collect ${formatCommerceMoney(order.totalAmount, rider.company.currencyCode)}` : ""}</p>
          {canSeeCustomerPii && <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm">
            <b>{order.customerNameSnapshot}</b>
            <p>{order.customerMobileSnapshot}</p>
            <p className="mt-2">Door / Flat No.: {address?.doorOrFlatNumber}</p>
            <p>Building Name: {address?.buildingName}</p>
            <p>{address?.area}</p>
            <p>{address?.city}</p>
            <p>{address?.landmark}</p>
            <p className="mt-2 text-slate-500">{address?.deliveryInstructions}</p>
            <p className="mt-2 text-slate-500">Customer instructions: {order.specialInstructions || "No special instructions"}</p>
          </div>}
          {!canSeeCustomerPii && <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm">
            <p className="font-semibold">Delivery details hidden after completion.</p>
            {order.deliveredAt && <p className="mt-2 text-slate-500">Delivered at {order.deliveredAt.toLocaleString()}</p>}
          </div>}
          <ul className="mt-4 space-y-2 text-sm">
            {order.items.map((item) => <li key={item.id} className="rounded-md border border-slate-200 px-3 py-2"><b>{item.quantity}x {item.productNameSnapshot}</b></li>)}
          </ul>
          {canSeeCustomerPii && <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`tel:${order.customerMobileSnapshot}`} className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold">Call</a>
            <a href={whatsappLink(order.customerMobileSnapshot, `I am on the way with order ${order.orderNumber}.`)} className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold">WhatsApp</a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${latitude && longitude ? `${latitude},${longitude}` : encodeURIComponent(`${address?.doorOrFlatNumber ?? ""} ${address?.buildingName ?? ""} ${address?.area ?? ""} ${address?.city ?? ""}`)}`} className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold">Map</a>
            <div className="px-3 py-2 text-center text-sm font-semibold text-slate-600">{order.paymentStatus}</div>
          </div>}
          {canSeeCustomerPii && <RiderMobileActions orderId={order.id} status={order.status} totalAmount={Number(order.totalAmount)} companyId={rider.companyId} />}
        </section>}
      </div>
    </main>
  );
}
