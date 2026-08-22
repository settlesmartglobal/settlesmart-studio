"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function StorefrontActions({ businessName, storeUrl }: { businessName: string; storeUrl: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone());
  const [iosHelp, setIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && localStorage.getItem("settlesmart-install-dismissed") === "1");

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    if (isIosSafari()) setIosHelp(true);
  }

  async function share() {
    const text = `Order directly from ${businessName}: ${storeUrl}`;
    if (navigator.share) await navigator.share({ title: businessName, text, url: storeUrl });
    else await navigator.clipboard?.writeText(storeUrl);
  }

  if (installed || dismissed) return <button type="button" onClick={() => void share()} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Share Store</button>;
  return <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={install} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Add {businessName} to Home Screen</button><button type="button" onClick={() => void share()} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Share Store</button><button type="button" onClick={() => { localStorage.setItem("settlesmart-install-dismissed", "1"); setDismissed(true); }} className="text-sm text-slate-500">Dismiss</button>{iosHelp && <div className="basis-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Add this store to your Home Screen</p><ol className="mt-2 list-decimal pl-5"><li>Tap Share</li><li>Choose Add to Home Screen</li><li>Tap Add</li></ol></div>}</div>;
}
