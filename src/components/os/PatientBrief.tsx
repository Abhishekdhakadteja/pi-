"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { aiPatientSummary } from "@/app/doctor/actions";

type Words = {
  pbTitle: string;
  pbAuto: string;
  pbAi: string;
  pbAiWorking: string;
  pbAiFailed: string;
  pbAiOff: string;
  pbAiNote: string;
  soon: string;
};

/** Doctor's brief for the patient in the room: free auto points, plus the Claude summary when connected. */
export function PatientBrief({
  appointmentId,
  lines,
  aiOn,
  proLocked = null,
  words: w,
}: {
  appointmentId: string;
  lines: string[];
  aiOn: boolean;
  /** text of the "needs Pro" link, when the clinic is not on Pro */
  proLocked?: string | null;
  words: Words;
}) {
  const [ai, setAi] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="card os-scan relative overflow-hidden border-violet-400/30" data-testid="patient-brief">
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />
            </svg>
            <span className="os-gradient-text">{w.pbTitle}</span>
          </h2>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-300">{w.pbAuto}</span>
        </div>
        <ul className="mt-2 flex flex-col gap-1.5 text-[17px] text-slate-200">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              <span>{l}</span>
            </li>
          ))}
        </ul>

        {ai && (
          <div className="mt-3 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3" data-testid="ai-summary">
            <ul className="flex flex-col gap-1.5 text-[16px] text-violet-50">
              {ai.map((l, i) => (
                <li key={i}>• {l}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-violet-200/80">{w.pbAiNote}</p>
          </div>
        )}
        {failed && <p className="error-box mt-3 text-base">{w.pbAiFailed}</p>}

        {aiOn ? (
          !ai && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setFailed(false);
                  const r = await aiPatientSummary(appointmentId);
                  if (r.ok) setAi(r.lines);
                  else setFailed(true);
                })
              }
              className="btn-small mt-3 w-full gap-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white"
            >
              {pending ? w.pbAiWorking : `✦ ${w.pbAi}`}
            </button>
          )
        ) : proLocked ? (
          <Link
            href="/pro"
            className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-50"
            data-testid="ai-pro-lock"
          >
            <span>✦ {proLocked}</span>
            <span className="pro-text rounded-full border border-amber-300/50 px-2 text-xs font-extrabold">PRO</span>
          </Link>
        ) : (
          <Link
            href="/ai#claude"
            className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100"
          >
            <span>✦ {w.pbAiOff}</span>
            <span className="rounded-full border border-violet-400/40 px-2 text-xs font-bold">{w.soon}</span>
          </Link>
        )}
      </div>
    </section>
  );
}
