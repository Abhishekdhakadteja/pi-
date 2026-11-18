"use client";
import { useState } from "react";
import type { Integration, IntegrationStatus } from "@/lib/integrations";
import type { CardWords } from "@/lib/os-content";
import type { Lang } from "@/lib/i18n";
import { LogoTile } from "./LogoTile";
import { StatusPill } from "./StatusPill";

/**
 * One AI service. Live ones just show "Live". Key-ready ones show Connect with the exact
 * setup steps; roadmap ones show Join with what is needed. Nothing here pretends to work.
 */
export function IntegrationCard({
  item,
  status,
  w,
  lang,
  isAdmin,
}: {
  item: Integration;
  status: IntegrationStatus;
  w: CardWords;
  lang: Lang;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const action = status === "ready" ? w.connect : status === "soon" ? w.join : null;
  const steps = item.steps[lang];
  return (
    <li id={item.id} className="card flex scroll-mt-40 flex-col gap-3 p-4" data-testid={`svc-${item.id}`} data-status={status}>
      <div className="flex items-start gap-3">
        <LogoTile icon={item.icon} accent={item.accent} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-lg font-bold text-white">{item.title[lang]}</span>
            <StatusPill status={status} w={w} />
          </div>
          <div className="font-brand text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">{item.provider}</div>
        </div>
      </div>
      <p className="text-base leading-relaxed text-slate-300">{item.body[lang]}</p>
      {action && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`btn-small min-h-11 w-full gap-2 border ${
            status === "ready"
              ? "border-transparent bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] text-[#020617]"
              : "border-violet-400/40 bg-violet-500/10 text-violet-100"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {status === "ready" ? <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
          {open ? w.hide : action}
        </button>
      )}
      {open && steps.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-slate-300">
          <p className="mb-2 font-semibold text-white">{status === "ready" ? w.readyNote : w.soonNote}</p>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="mt-2 text-cyan-200/90">
            {w.cost}: {item.cost[lang]}
          </p>
          {status === "ready" && !isAdmin && <p className="mt-1 text-amber-200/90">{w.adminOnly}</p>}
        </div>
      )}
    </li>
  );
}
