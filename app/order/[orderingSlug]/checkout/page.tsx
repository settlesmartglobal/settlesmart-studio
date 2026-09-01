import Link from "next/link";
import { CheckoutForm } from "../../../components/cart";

export default async function CheckoutPage({ params }: { params: Promise<{ orderingSlug: string }> }) {
  const { orderingSlug } = await params;
  return <main className="min-h-screen bg-[#f7f3ed] px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><Link href={`/order/${orderingSlug}/cart`} className="text-sm font-semibold text-emerald-700">Back to cart</Link><h1 className="mt-4 text-3xl font-semibold">Checkout</h1><p className="mb-5 mt-1 text-sm text-slate-500">Choose delivery or pickup, confirm your details, and place your order.</p><CheckoutForm slug={orderingSlug} /></div></main>;
}
