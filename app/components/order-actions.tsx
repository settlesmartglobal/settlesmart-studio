"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Rider = { id: string; name: string; mobile?: string; vehicleType?: string | null; vehicleNumber?: string | null; availabilityStatus: string; active?: boolean };

async function patchOrder(orderId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Order update failed");
  return json;
}

const labels: Record<string, string> = {
  ACCEPTED: "Accept",
  REJECTED: "Reject",
  PREPARING: "Start Preparing",
  READY: "Prepared",
  RIDER_ASSIGNED: "Assign Rider",
  PICKED_UP: "Picked Up",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  PAYMENT_COLLECTED: "Collect Payment",
  COMPLETED: "Complete Order",
  CANCELLED: "Cancel",
};

export function OrderActionButtons({
  orderId,
  status,
  fulfilmentType,
  riders = [],
  receiptHref,
}: {
  orderId: string;
  status: string;
  fulfilmentType: string;
  riders?: Rider[];
  receiptHref?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [riderId, setRiderId] = useState(riders.find((rider) => rider.active !== false && rider.availabilityStatus === "AVAILABLE")?.id ?? "");
  const [busy, setBusy] = useState("");
  const actions = status === "PENDING" ? ["ACCEPTED", "REJECTED"] :
    status === "ACCEPTED" ? ["PREPARING", "CANCELLED"] :
    status === "PREPARING" ? ["READY", "CANCELLED"] :
    status === "READY" ? (fulfilmentType === "DELIVERY" ? ["RIDER_ASSIGNED", "CANCELLED"] : ["PAYMENT_COLLECTED", "CANCELLED"]) :
    status === "RIDER_ASSIGNED" ? ["PICKED_UP", "RIDER_ASSIGNED", "CANCELLED"] :
    status === "PICKED_UP" ? ["OUT_FOR_DELIVERY"] :
    status === "OUT_FOR_DELIVERY" ? ["DELIVERED"] :
    status === "PAYMENT_COLLECTED" ? ["COMPLETED"] : [];

  async function run(nextStatus: string) {
    setBusy(nextStatus);
    setError("");
    setMessage("");
    const requiresReason = nextStatus === "REJECTED" || nextStatus === "CANCELLED";
    if (requiresReason && !reason.trim()) {
      setError("Enter a reason before saving.");
      setBusy("");
      return;
    }
    try {
      await patchOrder(orderId, { status: nextStatus, riderId: nextStatus === "RIDER_ASSIGNED" ? riderId : undefined, reason: requiresReason ? reason : undefined });
      setMessage(`${labels[nextStatus]} saved`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order update failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {(actions.includes("RIDER_ASSIGNED") || status === "RIDER_ASSIGNED") && <select value={riderId} onChange={(event) => setRiderId(event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">Select available rider</option>{riders.map((rider) => <option key={rider.id} value={rider.id} disabled={rider.active === false || rider.availabilityStatus !== "AVAILABLE"}>{rider.name} · {rider.mobile ?? "No mobile"} · {rider.vehicleType ?? "Vehicle"} · {rider.availabilityStatus}</option>)}</select>}
      {(actions.includes("REJECTED") || actions.includes("CANCELLED")) && <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason required for reject/cancel" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />}
      <div className="flex flex-wrap gap-2 text-xs">
        {actions.map((nextStatus) => nextStatus === "PAYMENT_COLLECTED" ? null : <button key={nextStatus} disabled={busy !== ""} onClick={() => run(nextStatus)} className="rounded bg-slate-950 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy === nextStatus ? "Saving..." : status === "RIDER_ASSIGNED" && nextStatus === "RIDER_ASSIGNED" ? "Reassign Rider" : labels[nextStatus]}</button>)}
        {status === "REJECTED" && <span className="rounded bg-slate-100 px-3 py-2 font-semibold text-slate-700">View Reason</span>}
        {status === "CANCELLED" && <span className="rounded bg-slate-100 px-3 py-2 font-semibold text-slate-700">View Reason</span>}
        {["PAYMENT_COLLECTED", "COMPLETED"].includes(status) && receiptHref && <Link href={receiptHref} className="rounded bg-slate-100 px-3 py-2 font-semibold text-slate-800">View Receipt</Link>}
      </div>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function PaymentRecordForm({ orderId, totalAmount }: { orderId: string; totalAmount: number }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <form className="mt-3 grid gap-2 text-xs" onSubmit={async (event) => {
      event.preventDefault();
      setMessage("");
      setError("");
      const form = Object.fromEntries(new FormData(event.currentTarget));
      try {
        await patchOrder(orderId, { status: "PAYMENT_COLLECTED", paymentStatus: "COLLECTED", paymentMethod: form.paymentMethod, amountCollected: form.amountCollected, paymentCollectedBy: form.paymentCollectedBy, paymentNotes: form.paymentNotes });
        setMessage("Payment collected and receipt prepared");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment update failed");
      }
    }}>
      <select name="paymentMethod" className="rounded-md border border-slate-200 px-2 py-2"><option value="CASH_ON_DELIVERY">Cash</option><option value="CARD_ON_DELIVERY">Card on Delivery</option><option value="ONLINE">Online</option><option value="PICKUP_PAYMENT">Not Required</option></select>
      <input name="amountCollected" type="number" step="0.01" defaultValue={totalAmount.toFixed(2)} className="rounded-md border border-slate-200 px-2 py-2" />
      <input name="paymentCollectedBy" required placeholder="Collected by" className="rounded-md border border-slate-200 px-2 py-2" />
      <input name="paymentNotes" placeholder="Payment notes" className="rounded-md border border-slate-200 px-2 py-2" />
      <button className="rounded bg-emerald-600 px-3 py-2 font-semibold text-white">Confirm Payment</button>
      {message && <p className="text-emerald-700">{message}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}

export function RiderMobileActions({ orderId, status, totalAmount }: { orderId: string; status: string; totalAmount: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const actions = status === "RIDER_ASSIGNED" ? [["PICKED_UP", "Picked Up"]] : status === "PICKED_UP" ? [["OUT_FOR_DELIVERY", "Out for Delivery"]] : status === "OUT_FOR_DELIVERY" ? [["DELIVERED", "Delivered"]] : [];
  async function run(nextStatus: string, extra: Record<string, unknown> = {}) {
    setError("");
    try {
      await patchOrder(orderId, { status: nextStatus, ...extra });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }
  return <div className="mt-4 grid gap-2 text-sm">{actions.map(([nextStatus, label]) => <button key={nextStatus} onClick={() => run(nextStatus)} className="w-full rounded-md bg-slate-950 px-4 py-3 font-semibold text-white">{label}</button>)}{status === "DELIVERED" && <button onClick={() => run("PAYMENT_COLLECTED", { paymentStatus: "COLLECTED", amountCollected: totalAmount, paymentCollectedBy: "Delivery rider" })} className="w-full rounded-md bg-emerald-600 px-4 py-3 font-semibold text-white">Collect Payment</button>}{error && <p className="text-sm text-red-600">{error}</p>}</div>;
}
