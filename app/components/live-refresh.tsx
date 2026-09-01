"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatRefreshTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function LiveRefresh({ intervalMs = 15000, active = true }: { intervalMs?: number; active?: boolean }) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!active) return;
    const initialTimer = window.setTimeout(() => setLastUpdated(formatRefreshTime(new Date())), 0);
    function refresh() {
      if (document.hidden) {
        setHidden(true);
        return;
      }
      setHidden(false);
      setLastUpdated(formatRefreshTime(new Date()));
      router.refresh();
    }
    const visibility = () => {
      setHidden(document.hidden);
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", visibility);
    const timer = window.setInterval(refresh, intervalMs);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [active, intervalMs, router]);

  if (!active) return null;
  const status = hidden ? "Updates paused while this tab is hidden. Reconnecting when visible." : lastUpdated ? `Last updated ${lastUpdated}` : "Last updated --:--:--";
  return <p className="mb-3 text-xs text-slate-500">{status}</p>;
}
