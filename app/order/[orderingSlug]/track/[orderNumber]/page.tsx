import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatCommerceMoney } from "@/modules/wave1/utils";
import { LiveRefresh } from "../../../../components/live-refresh";
import { FeedbackForm } from "../../../../components/commerce-actions";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params, searchParams }: { params: Promise<{ orderingSlug: string; orderNumber: string }>; searchParams: Promise<{ token?: string }> }) {
  const { orderingSlug, orderNumber } = await params;
  const { token } = await searchParams;
  const order = await prisma.order.findFirst({ where: { orderNumber, trackingToken: token ?? "", company: { orderingSlug } }, include: { items: true, rider: true, statusHistory: { orderBy: { createdAt: "asc" } }, company: true } });
  if (!order) notFound();
  const terminal = ["COMPLETED", "CANCELLED", "REJECTED"].includes(order.status);
  const receiptReady = ["PAYMENT_COLLECTED", "COMPLETED"].includes(order.status);
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><LiveRefresh intervalMs={5000} active={!terminal} /><div className="mx-auto max-w-2xl rounded-lg bg-white p-6"><h1 className="text-2xl font-semibold">Track {order.orderNumber}</h1><p className="mt-2 text-lg font-semibold text-sky-700">{order.status.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-slate-500">{order.company.name} · {order.fulfilmentType} · {order.paymentMethod} · {order.paymentStatus}</p><div className="mt-6 rounded-md bg-slate-50 p-4"><h2 className="font-semibold">Items</h2>{order.items.map((item) => <p key={item.id} className="mt-2 text-sm">{item.quantity}x {item.productNameSnapshot}</p>)}<p className="mt-3 font-semibold">Total {formatCommerceMoney(order.totalAmount, order.company.currencyCode)}</p><p className="mt-2 text-sm">Customer instructions: {order.specialInstructions || "No special instructions"}</p>{order.rider && <p className="mt-1 text-sm">Rider: {order.rider.name}</p>}</div><Timeline status={order.status} />{receiptReady && <a href={`/receipt/${order.orderNumber}?token=${token}`} className="mt-5 inline-flex rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">View Receipt</a>}{["PAYMENT_COLLECTED", "COMPLETED"].includes(order.status) && <FeedbackForm orderNumber={order.orderNumber} token={token ?? ""} />}</div></main>;
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
