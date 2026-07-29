import { notFound } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { formatMoney } from "@/modules/wave1/utils";

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ orderReference: string }>; searchParams: Promise<{ token?: string }> }) {
  const { orderReference } = await params;
  const { token } = await searchParams;
  const order = await prisma.order.findFirst({
    where: { orderNumber: orderReference, trackingToken: token ?? "" },
    include: { company: true, items: true, branch: true, rider: true },
  });
  if (!order) notFound();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 print:bg-white">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">{order.company.name}</p>
            <h1 className="text-2xl font-semibold">Receipt</h1>
            <p className="text-sm text-slate-500">{order.orderNumber}</p>
          </div>
        </div>
        <section className="mt-5 grid gap-2 text-sm">
          <p><b>Customer:</b> {order.customerNameSnapshot}</p>
          <p><b>Fulfilment:</b> {order.fulfilmentType}</p>
          <p><b>Payment:</b> {order.paymentMethod} · {order.paymentStatus}</p>
          {order.branch && <p><b>Branch:</b> {order.branch.name}</p>}
        </section>
        <section className="mt-5">
          <h2 className="font-semibold">Items</h2>
          <div className="mt-2 space-y-2 text-sm">{order.items.map((item) => <div key={item.id} className="flex justify-between border-b border-slate-100 py-2"><span>{item.quantity}x {item.productNameSnapshot}</span><span>AED {formatMoney(item.lineTotal)}</span></div>)}</div>
        </section>
        <section className="mt-5 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>AED {formatMoney(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>AED {formatMoney(order.discountAmount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>AED {formatMoney(order.taxAmount)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>AED {formatMoney(order.deliveryCharge)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><span>Total</span><span>AED {formatMoney(order.totalAmount)}</span></div>
        </section>
      </div>
    </main>
  );
}
