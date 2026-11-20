"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/components/LangProvider";
import { emptyData, parseData, ymd, type ProData } from "@/lib/health/pro-data";
import { proWords, type ProWords } from "./words";
import { TodayTab } from "./TodayTab";
import { MedsTab } from "./MedsTab";
import { VitalsTab } from "./VitalsTab";
import { FamilyTab } from "./FamilyTab";
import { VisitsTab } from "./VisitsTab";
import { SosSheet } from "./SosSheet";

export const STORE_KEY = "ce-health-pro-v1";

export type TabProps = {
  data: ProData;
  update: (fn: (d: ProData) => ProData) => void;
  w: ProWords;
  lang: "hi" | "en";
  today: string;
};

type Tab = "today" | "meds" | "vitals" | "family" | "visits";

export function ProApp({ status, until }: { status: "pro" | "trial"; until: string | null }) {
  const { lang } = useT();
  const w = proWords(lang);
  const [data, setData] = useState<ProData | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [sos, setSos] = useState(false);
  const today = useMemo(() => ymd(new Date()), []);

  useEffect(() => {
    let d: ProData | null = null;
    try {
      d = parseData(JSON.parse(localStorage.getItem(STORE_KEY) ?? "null"));
    } catch {
      d = null;
    }
    setData(d ?? emptyData(lang === "hi" ? "मैं" : "Me"));
  }, [lang]);

  const update = useCallback((fn: (d: ProData) => ProData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // storage full or private mode: keeps working for this visit
      }
      return next;
    });
  }, []);

  if (!data) return <p className="py-10 text-center text-slate-400">...</p>;
  const active = data.profiles.find((p) => p.id === data.activeId) ?? data.profiles[0];
  const props: TabProps = { data, update, w, lang, today };
  const tabs: { id: Tab; emoji: string; label: string }[] = [
    { id: "today", emoji: "🏠", label: w.tabToday },
    { id: "meds", emoji: "💊", label: w.tabMeds },
    { id: "vitals", emoji: "📈", label: w.tabVitals },
    { id: "family", emoji: "👨‍👩‍👧", label: w.tabFamily },
    { id: "visits", emoji: "🩺", label: w.tabVisits },
  ];

  return (
    <main data-testid="pro-app" className="pb-24">
      <div className="no-print flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {w.title}{" "}
            <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2 py-0.5 align-middle text-xs font-bold text-white">
              {status === "pro" ? w.pro : w.trial}
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            {until} {w.until} · 🔒 {w.savedOnPhone}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSos(true)}
          className="h-14 w-14 shrink-0 rounded-full bg-red-600 text-lg font-black text-white shadow-[0_0_30px_-4px_rgba(239,68,68,0.9)]"
          data-testid="sos-btn"
          aria-label={w.sosTitle}
        >
          {w.sos}
        </button>
      </div>

      {/* family member switcher */}
      {data.profiles.length > 1 && (
        <div className="no-print mt-3 flex gap-2 overflow-x-auto pb-1">
          {data.profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`health-chip shrink-0 ${p.id === active.id ? "health-chip-on" : ""}`}
              onClick={() => update((d) => ({ ...d, activeId: p.id }))}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {tab === "today" && <TodayTab {...props} goTo={(t) => setTab(t)} />}
        {tab === "meds" && <MedsTab {...props} />}
        {tab === "vitals" && <VitalsTab {...props} />}
        {tab === "family" && <FamilyTab {...props} />}
        {tab === "visits" && <VisitsTab {...props} />}
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#050b1a]/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${tab === t.id ? "text-cyan-300" : "text-slate-400"}`}
            >
              <span className="text-xl" aria-hidden>
                {t.emoji}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {sos && <SosSheet data={data} w={w} lang={lang} onClose={() => setSos(false)} />}
    </main>
  );
}
