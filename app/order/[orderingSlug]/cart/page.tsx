import Link from "next/link";
import { CartView } from "../../../components/cart";

export default async function CartPage({ params }: { params: Promise<{ orderingSlug: string }> }) {
  const { orderingSlug } = await params;
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6"><Link href={`/order/${orderingSlug}`} className="text-sm text-sky-700">Back to menu</Link><h1 className="mt-4 text-2xl font-semibold">Cart</h1><div className="mt-4"><CartView slug={orderingSlug} /></div></div></main>;
}
