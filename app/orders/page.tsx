import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { formatCommerceMoney } from "@/modules/wave1/utils";
import { AppShell, EmptyState, Panel } from "../components/shell";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({ include: { company: true, items: true }, orderBy: { placedAt: "desc" } });
  return <AppShell title="Orders">{orders.length === 0 ? <EmptyState title="No orders yet" body="Customer and manual orders will appear here." /> : <Panel><table className="w-full text-sm"><tbody>{orders.map((o) => <tr key={o.id} className="border-b border-slate-100"><td className="py-3"><Link href={`/orders/${o.id}?companyId=${o.companyId}`} className="font-semibold text-sky-700">{o.orderNumber}</Link><div className="text-xs text-slate-500">{o.company.name} · {o.customerNameSnapshot}</div></td><td>{o.fulfilmentType.replaceAll("_", " ")}</td><td>{o.items.length} items</td><td>{o.status.replaceAll("_", " ")}</td><td>{formatCommerceMoney(o.totalAmount, o.company.currencyCode)}</td><td><Link href={`/orders/${o.id}?companyId=${o.companyId}`} className="font-semibold text-emerald-700">View Order</Link></td></tr>)}</tbody></table></Panel>}</AppShell>;
}
