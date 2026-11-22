"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";

// Friendly message for any unexpected error, in Hindi and English.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  // Tell the owner's error log (no patient details are sent; the server masks numbers too).
  useEffect(() => {
    try {
      const body = JSON.stringify({ path: location.pathname, message: error?.message?.slice(0, 300), digest: error?.digest });
      if (!navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }))) {
        fetch("/api/errors", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {
      // never let reporting break the error screen
    }
  }, [error]);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
      <div className="text-5xl" aria-hidden>⚠️</div>
      <p className="text-2xl font-bold">{t("err_generic")}</p>
      <p className="text-lg text-slate-600">कुछ गड़बड़ हो गई। · Something went wrong.</p>
      <button className="btn-primary" onClick={reset}>↻</button>
      <Link className="btn-secondary" href="/">{t("home")}</Link>
    </main>
  );
}
