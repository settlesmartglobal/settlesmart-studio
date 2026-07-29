import Link from "next/link";
import { CheckoutForm } from "../../../components/cart";

export default async function CheckoutPage({ params }: { params: Promise<{ orderingSlug: string }> }) {
  const { orderingSlug } = await params;
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6"><Link href={`/order/${orderingSlug}/cart`} className="text-sm text-sky-700">Back to cart</Link><h1 className="mt-4 text-2xl font-semibold">Checkout</h1><p className="mb-4 mt-1 text-sm text-slate-500">Delivery address can be entered manually, or you can use browser geolocation.</p><CheckoutForm slug={orderingSlug} /></div></main>;
}
