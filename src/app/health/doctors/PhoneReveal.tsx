"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { getHealthWords } from "@/lib/health/words";
import { telHref, whatsAppBookingHref } from "@/lib/health/links";
import { revealPhone } from "./actions";

export function PhoneReveal({ placeId, doctor }: { placeId: string; doctor: string }) {
  const { lang } = useT();
  const w = getHealthWords(lang);
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ phone: string | null; wa: string | null } | null>(null);

  if (!res) {
    return (
      <button
        type="button"
        className="health-btn-ghost"
        disabled={pending}
        onClick={() => start(async () => setRes(await revealPhone(placeId)))}
      >
        📞 {pending ? "..." : w.showNumber}
      </button>
    );
  }
  if (!res.phone) return <span className="text-sm text-slate-400">{w.noPhone}</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <a href={telHref(res.phone)} className="health-btn-ghost">
        📞 {w.callNow} · {res.phone}
      </a>
      {res.wa ? (
        <a href={whatsAppBookingHref(res.wa, doctor, lang)} target="_blank" rel="noopener noreferrer" className="health-btn-ghost health-wa">
          💬 {w.whatsappBook}
        </a>
      ) : (
        <span className="text-xs text-slate-400">{w.landline}</span>
      )}
    </span>
  );
}
