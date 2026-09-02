import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatCommerceMoney } from "@/modules/wave1/utils";
import { addOnLabel, orderItemOptions, variantLabel } from "@/modules/wave1/order-display";
import { AppShell, Panel } from "../../components/shell";
import { OrderActionButtons, PaymentRecordForm } from "../../components/order-actions";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ companyId?: string }> }) {
  const { id } = await params;
  const { companyId } = await searchParams;
  if (!companyId) notFound();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      company: { include: { riders: { orderBy: { name: "asc" } } } },
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      rider: true,
    },
  });
  if (!order) notFound();
  if (order.companyId !== companyId) notFound();
  const address = order.deliveryAddressSnapshotJson && typeof order.deliveryAddressSnapshotJson === "object" ? order.deliveryAddressSnapshotJson as Record<string, string> : {};
  const mapsUrl = order.customerLatitude && order.customerLongitude ? `https://www.google.com/maps/dir/?api=1&destination=${order.customerLatitude},${order.customerLongitude}` : "";
  const riderOptions = order.company.riders.map((rider) => ({ id: rider.id, name: rider.name, mobile: rider.mobile, vehicleType: rider.vehicleType, vehicleNumber: rider.vehicleNumber, availabilityStatus: rider.availabilityStatus, active: rider.active }));
  return (
    <AppShell title={`Order ${order.orderNumber}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <p className="text-sm font-semibold text-slate-500">{order.company.name}</p>
              <h2 className="text-2xl font-semibold">{order.orderNumber}</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{order.status.replaceAll("_", " ")}</span>
          </div>
          <OrderActionButtons orderId={order.id} status={order.status} fulfilmentType={order.fulfilmentType} companyId={order.companyId} riders={riderOptions} receiptHref={`/receipt/${order.orderNumber}?token=${order.trackingToken}`} />
          {((order.fulfilmentType === "PICKUP" && order.status === "READY") || order.status === "DELIVERED") && <PaymentRecordForm orderId={order.id} totalAmount={Number(order.totalAmount)} companyId={order.companyId} />}
          <section className="mt-6">
            <h3 className="font-semibold">Full Order Items</h3>
            <div className="mt-3 space-y-3">
              {order.items.map((item) => {
                const options = orderItemOptions(item);
                return <article key={item.id} className="rounded-md border border-slate-200 p-4 text-sm"><div className="flex flex-wrap justify-between gap-4"><b>{item.quantity} × {item.productNameSnapshot}</b><span className="font-semibold">Line total: {formatCommerceMoney(item.lineTotal, order.company.currencyCode)}</span></div>{variantLabel(options.variant) && <p className="mt-2 text-slate-600">{variantLabel(options.variant)}</p>}{options.addOns.length > 0 && <ul className="mt-2 space-y-1 text-slate-700">{options.addOns.map((addOn, index) => <li key={`${addOn.id ?? addOn.name}-${index}`}>{addOnLabel(addOn, order.company.currencyCode)}</li>)}</ul>}{options.instructions && <p className="mt-2 rounded-md bg-slate-50 p-2 text-slate-700">Special instructions: {options.instructions}</p>}</article>;
              })}
            </div>
          </section>
        </Panel>
        <div className="space-y-5">
          <Panel><h3 className="font-semibold">Order Summary</h3><dl className="mt-3 grid gap-2 text-sm"><Row label="Created" value={order.placedAt.toLocaleString()} /><Row label="Fulfilment" value={order.fulfilmentType.replaceAll("_", " ")} /><Row label="Payment method" value={order.paymentMethod.replaceAll("_", " ")} /><Row label="Payment status" value={order.paymentStatus.replaceAll("_", " ")} /><Row label="Subtotal" value={formatCommerceMoney(order.subtotal, order.company.currencyCode)} />{Number(order.deliveryCharge) > 0 && <Row label="Delivery charge" value={formatCommerceMoney(order.deliveryCharge, order.company.currencyCode)} />}{Number(order.discountAmount) > 0 && <Row label="Discount" value={formatCommerceMoney(order.discountAmount, order.company.currencyCode)} />}<Row label="Final total" value={formatCommerceMoney(order.totalAmount, order.company.currencyCode)} />{order.rider && <Row label="Rider" value={order.rider.name} />}</dl></Panel>
          <Panel><h3 className="font-semibold">Customer</h3><div className="mt-3 space-y-2 text-sm text-slate-600"><p><b>{order.customerNameSnapshot}</b></p><p>{order.customerMobileSnapshot}</p><p>{[address.doorOrFlatNumber, address.buildingName, address.area, address.city, address.landmark].filter(Boolean).join(", ") || "No delivery address"}</p>{(order.customerLatitude || order.customerLongitude) && <p>Location: {String(order.customerLatitude ?? "")}, {String(order.customerLongitude ?? "")}</p>}{mapsUrl && <a href={mapsUrl} className="text-sky-700" target="_blank">Open Google Maps navigation</a>}<p>Delivery notes: {address.deliveryInstructions || "None"}</p><p>Customer instructions: {order.specialInstructions || "None"}</p></div></Panel>
          <Panel><h3 className="font-semibold">Timeline</h3>{order.statusHistory.map((history) => <div key={history.id} className="mt-3 text-sm"><b>{history.newStatus.replaceAll("_", " ")}</b><div className="text-slate-500">{history.note ?? history.reason ?? ""}</div></div>)}</Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium">{value}</dd></div>;
}
