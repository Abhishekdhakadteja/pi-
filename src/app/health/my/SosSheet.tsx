"use client";
import { useState } from "react";
import { sosMessage, type ProData } from "@/lib/health/pro-data";
import { toWhatsAppNumber } from "@/lib/health/links";
import type { ProWords } from "./words";

export function SosSheet({ data, w, lang, onClose }: { data: ProData; w: ProWords; lang: "hi" | "en"; onClose: () => void }) {
  const active = data.profiles.find((p) => p.id === data.activeId) ?? data.profiles[0];
  const contacts = active.contacts.map((c) => ({ ...c, wa: toWhatsAppNumber(c.phone) })).filter((c) => c.wa);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function getLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 p-3" role="dialog" aria-modal="true" data-testid="sos-sheet">
      <div className="w-full max-w-md rounded-3xl border border-red-400/50 bg-[#1a0610] p-5">
        <p className="text-2xl font-bold text-red-100">🆘 {w.sosTitle}</p>
        <a href="tel:108" className="mt-4 block rounded-2xl bg-red-600 py-4 text-center text-xl font-black text-white">
          📞 {w.sosCall}
        </a>
        <p className="mt-4 text-sm text-red-100">{w.sosFamily}</p>
        {contacts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300">{w.sosNoContact}</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {!loc && (
              <button type="button" onClick={getLocation} className="health-btn-ghost justify-center" disabled={locating}>
                📍 {locating ? w.sosLocating : "GPS"}
              </button>
            )}
            {contacts.map((c) => (
              <a
                key={c.phone}
                href={`https://wa.me/${c.wa}?text=${encodeURIComponent(sosMessage(active.name, loc?.lat ?? null, loc?.lng ?? null, lang))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="health-btn-ghost health-wa justify-center"
              >
                💬 {c.name || c.phone}
              </a>
            ))}
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-5 w-full text-center text-sm text-slate-300 underline">
          {w.close}
        </button>
      </div>
    </div>
  );
}
