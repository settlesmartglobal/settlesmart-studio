"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Rider = { id: string; name: string; availabilityStatus: string };

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

export function OrderActionButtons({
  orderId,
  status,
  fulfilmentType,
  riders = [],
  paymentStatus,
}: {
  orderId: string;
  status: string;
  fulfilmentType: string;
  riders?: Rider[];
  paymentStatus?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [riderId, setRiderId] = useState(riders.find((rider) => rider.availabilityStatus === "AVAILABLE")?.id ?? "");
  const [busy, setBusy] = useState("");

  async function run(nextStatus: string, extra: Record<string, unknown> = {}) {
    setBusy(nextStatus);
    setError("");
    setMessage("");
    try {
      await patchOrder(orderId, { status: nextStatus, ...extra });
      setMessage(`${nextStatus.replaceAll("_", " ")} saved`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order update failed");
    } finally {
      setBusy("");
    }
  }

  const canCompleteWithoutPaymentForm = paymentStatus === "COLLECTED" || paymentStatus === "NOT_REQUIRED";
  const actions = status === "PENDING" ? ["ACCEPTED", "REJECTED"] :
    status === "ACCEPTED" ? ["PREPARING", "CANCELLED"] :
    status === "PREPARING" ? ["READY", "CANCELLED"] :
    status === "READY" ? (fulfilmentType === "PICKUP" ? (canCompleteWithoutPaymentForm ? ["COMPLETED", "CANCELLED"] : ["CANCELLED"]) : ["RIDER_ASSIGNED", "CANCELLED"]) :
    status === "RIDER_ASSIGNED" ? ["PICKED_UP", "CANCELLED"] :
    status === "PICKED_UP" ? ["OUT_FOR_DELIVERY"] :
    status === "OUT_FOR_DELIVERY" ? ["DELIVERED"] :
    status === "DELIVERED" ? (canCompleteWithoutPaymentForm ? ["COMPLETED"] : []) : [];

  return (
    <div className="mt-3 space-y-2">
      {actions.includes("RIDER_ASSIGNED") && <select value={riderId} onChange={(event) => setRiderId(event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">Select available rider</option>{riders.map((rider) => <option key={rider.id} value={rider.id} disabled={rider.availabilityStatus !== "AVAILABLE"}>{rider.name} · {rider.availabilityStatus}</option>)}</select>}
      <div className="flex flex-wrap gap-2 text-xs">
        {actions.map((nextStatus) => <button key={nextStatus} disabled={busy !== ""} onClick={() => run(nextStatus, nextStatus === "RIDER_ASSIGNED" ? { riderId } : {})} className="rounded bg-slate-950 px-2 py-1 font-semibold text-white disabled:opacity-50">{busy === nextStatus ? "Saving..." : nextStatus.replaceAll("_", " ")}</button>)}
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
        await patchOrder(orderId, { status: form.status, paymentStatus: "COLLECTED", amountCollected: form.amountCollected, paymentCollectedBy: form.paymentCollectedBy, paymentNotes: form.paymentNotes });
        setMessage("Payment recorded");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment update failed");
      }
    }}>
      <input type="hidden" name="status" value="COMPLETED" />
      <input name="amountCollected" type="number" step="0.01" defaultValue={totalAmount.toFixed(2)} className="rounded-md border border-slate-200 px-2 py-1" />
      <input name="paymentCollectedBy" placeholder="Collected by" className="rounded-md border border-slate-200 px-2 py-1" />
      <input name="paymentNotes" placeholder="Payment notes" className="rounded-md border border-slate-200 px-2 py-1" />
      <button className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white">Record payment and complete</button>
      {message && <p className="text-emerald-700">{message}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}

export function RiderMobileActions({ orderId, status, totalAmount }: { orderId: string; status: string; totalAmount: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const actions = status === "RIDER_ASSIGNED" ? ["PICKED_UP"] : status === "PICKED_UP" ? ["OUT_FOR_DELIVERY"] : status === "OUT_FOR_DELIVERY" ? ["DELIVERED"] : [];
  async function run(nextStatus: string, paymentStatus?: string) {
    setError("");
    try {
      await patchOrder(orderId, { status: nextStatus, paymentStatus, amountCollected: paymentStatus === "COLLECTED" ? totalAmount : undefined, paymentCollectedBy: "Delivery rider" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }
  return <div className="mt-4 grid gap-2 text-sm">{actions.map((nextStatus) => <button key={nextStatus} onClick={() => run(nextStatus)} className="w-full rounded-md bg-slate-950 px-4 py-2 font-semibold text-white">{nextStatus.replaceAll("_", " ")}</button>)}{status === "DELIVERED" && <button onClick={() => run("COMPLETED", "COLLECTED")} className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white">Record payment collected</button>}{error && <p className="text-sm text-red-600">{error}</p>}</div>;
}
