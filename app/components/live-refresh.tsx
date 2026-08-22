"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LiveRefresh({ intervalMs = 15000, active = true }: { intervalMs?: number; active?: boolean }) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!active) return;
    function refresh() {
      if (document.hidden) {
        setHidden(true);
        return;
      }
      setHidden(false);
      setLastUpdated(new Date());
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
      window.clearInterval(timer);
    };
  }, [active, intervalMs, router]);
  if (!active) return null;
  return <p className="mb-3 text-xs text-slate-500">{hidden ? "Updates paused while this tab is hidden. Reconnecting when visible." : `Last updated ${lastUpdated.toLocaleTimeString()}`}</p>;
}
