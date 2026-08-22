"use client";

export function ReceiptActions({ whatsappUrl }: { whatsappUrl: string }) {
  async function copyLink() {
    await navigator.clipboard?.writeText(window.location.href);
  }
  return <div className="mt-6 flex flex-wrap gap-2 text-sm print:hidden"><button type="button" onClick={() => window.print()} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Print</button><button type="button" onClick={copyLink} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Copy Link</button><a href={whatsappUrl} className="rounded-md bg-slate-950 px-3 py-2 font-semibold text-white">Open WhatsApp</a></div>;
}
