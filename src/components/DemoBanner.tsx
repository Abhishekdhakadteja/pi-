"use client";
import { useEffect, useState } from "react";
import { waLink, helloText } from "@/lib/whatsapp";

/** Sticky bar during the 5-minute demo: countdown, then the browser is sent to /demo/end. */
export function DemoBanner({ exp, lang }: { exp: number; lang: "hi" | "en" }) {
  const [left, setLeft] = useState(() => Math.max(0, exp - Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, exp - Math.floor(Date.now() / 1000));
      setLeft(s);
      if (s <= 0) {
        clearInterval(t);
        window.location.href = "/demo/end";
      }
    }, 1000);
    return () => clearInterval(t);
  }, [exp]);
  const mm = String(Math.floor(left / 60)).padStart(1, "0");
  const ss = String(left % 60).padStart(2, "0");
  const hi = lang === "hi";
  return (
    <div className="no-print relative z-30 -mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/40 bg-amber-400/15 px-4 py-2 text-sm text-amber-50 backdrop-blur-xl" data-testid="demo-banner">
      <span>
        <b>{hi ? "LIVE डेमो" : "LIVE DEMO"}</b> · {hi ? "बचा समय" : "time left"}{" "}
        <b className="font-mono text-base" data-testid="demo-left">
          {mm}:{ss}
        </b>
        <span className="hidden sm:inline"> · {hi ? "नकली डेटा, असली मरीज़ की जानकारी न डालें" : "fake data, do not enter real patients"}</span>
      </span>
      <span className="flex gap-2">
        <a href={waLink(helloText(lang))} target="_blank" rel="noopener noreferrer" className="btn-small bg-emerald-500 text-white">
          WhatsApp
        </a>
        <a href="/demo/end" className="btn-small bg-white/10 text-white ring-1 ring-white/20">
          {hi ? "डेमो बंद करें" : "End demo"}
        </a>
      </span>
    </div>
  );
}
