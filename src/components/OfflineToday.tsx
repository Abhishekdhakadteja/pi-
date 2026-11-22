"use client";
import { useEffect } from "react";

// Keeps a copy of today's list on this device, so the clinic can keep working (and print)
// when the internet or the website is down. The copy lives only in this browser, is for
// today only, and is cleared on the login page (logout). See public/offline.html.
export const OFFLINE_KEY = "ce_today_v1";

export type OfflineRow = { token: number; time: string; name: string; age: number | null; phone: string; complaint: string; status: string };

export function OfflineToday({
  clinic,
  date,
  rows,
  labels,
}: {
  clinic: string;
  date: string;
  rows: OfflineRow[];
  labels: { print: string; saved: string };
}) {
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify({ clinic, date, savedAt: new Date().toISOString(), rows }));
    } catch {
      // storage full or blocked: the live page still works
    }
  }, [clinic, date, rows]);

  return (
    <div className="no-print mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
      <span>💾 {labels.saved}</span>
      <button type="button" className="btn-small bg-white/5 text-white ring-1 ring-white/20" onClick={() => window.print()} data-testid="print-today">
        🖨️ {labels.print}
      </button>
    </div>
  );
}

/** Registers the tiny service worker that shows the saved list when the site cannot be reached. */
export function OfflineHelper() {
  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

/** Login page: forget the previous user's saved list on this device. */
export function ClearOfflineCopy() {
  useEffect(() => {
    try {
      localStorage.removeItem(OFFLINE_KEY);
    } catch {}
  }, []);
  return null;
}
