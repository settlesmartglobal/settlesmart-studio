import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { LiveRefresh } from "../../components/live-refresh";
import { FeedbackForm } from "../../components/commerce-actions";

export const dynamic = "force-dynamic";

export default async function PublicTrackPage({ params, searchParams }: { params: Promise<{ orderReference: string }>; searchParams: Promise<{ token?: string }> }) {
  const { orderReference } = await params;
  const { token } = await searchParams;
  const order = await prisma.order.findFirst({
    where: { orderNumber: orderReference, trackingToken: token ?? "" },
    include: { company: true, items: true, rider: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();
  const terminal = ["COMPLETED", "CANCELLED", "REJECTED"].includes(order.status);
  const receiptReady = ["PAYMENT_COLLECTED", "COMPLETED"].includes(order.status);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <LiveRefresh intervalMs={5000} active={!terminal} />
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">{order.company.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">{order.orderNumber}</h1>
        <p className="mt-2 text-lg font-semibold">{order.status.replaceAll("_", " ")}</p>
        <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm">
          <p>{order.fulfilmentType} · {order.paymentMethod} · {order.paymentStatus}</p>
          <p className="mt-1">Total AED {Number(order.totalAmount).toFixed(2)}</p>
          <p className="mt-1">Customer instructions: {order.specialInstructions || "No special instructions"}</p>
          {order.rider && <p className="mt-1">Rider: {order.rider.name}</p>}
        </div>
        <section className="mt-5">
          <h2 className="font-semibold">Items</h2>
          {order.items.map((item) => <p key={item.id} className="mt-2 text-sm">{item.quantity}x {item.productNameSnapshot}</p>)}
        </section>
        <Timeline status={order.status} />
        {receiptReady && <a href={`/receipt/${order.orderNumber}?token=${token}`} className="mt-5 inline-flex rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">View Receipt</a>}
        {["PAYMENT_COLLECTED", "COMPLETED"].includes(order.status) && <FeedbackForm orderNumber={order.orderNumber} token={token ?? ""} />}
      </div>
    </main>
  );
}

const stages = [
  ["PENDING", "Order placed"],
  ["ACCEPTED", "Restaurant accepted"],
  ["PREPARING", "Preparing your food"],
  ["READY", "Food prepared"],
  ["RIDER_ASSIGNED", "Rider assigned"],
  ["PICKED_UP", "Picked up"],
  ["OUT_FOR_DELIVERY", "Out for delivery"],
  ["DELIVERED", "Delivered"],
  ["PAYMENT_COLLECTED", "Payment completed"],
  ["COMPLETED", "Order completed"],
];

function Timeline({ status }: { status: string }) {
  const current = stages.findIndex(([stage]) => stage === status);
  return <section className="mt-6 space-y-2"><h2 className="font-semibold">Live timeline</h2>{stages.map(([stage, label], index) => <div key={stage} className={`rounded-md border p-3 text-sm ${index < current ? "border-emerald-200 bg-emerald-50 text-emerald-900" : index === current ? "border-slate-950 bg-white text-slate-950" : "border-slate-200 bg-slate-50 text-slate-400"}`}><b>{index < current ? "✓ " : ""}{label}</b></div>)}</section>;
}
