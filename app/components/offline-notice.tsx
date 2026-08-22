"use client";

import { useEffect, useState } from "react";

export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-900">You&apos;re offline. Reconnect to continue ordering.</div>;
}
