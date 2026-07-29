import Link from "next/link";

export default async function ConfirmationPage({ params }: { params: Promise<{ orderingSlug: string; orderNumber: string }> }) {
  const { orderingSlug, orderNumber } = await params;
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6 text-center"><h1 className="text-2xl font-semibold">Order placed</h1><p className="mt-2 text-slate-600">Your order number is {orderNumber}.</p><Link href={`/order/${orderingSlug}/track/${orderNumber}`} className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Track order</Link></div></main>;
}
