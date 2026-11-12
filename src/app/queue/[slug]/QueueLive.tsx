"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useT } from "@/components/LangProvider";
import { queueView, type Q } from "@/lib/queue";

export function QueueLive({ clinicId, date, token }: { clinicId: string; date: string; token: number }) {
  const { t } = useT();
  const [q, setQ] = useState<Q | null>(null);
  const [online, setOnline] = useState(true);
  const retry = useRef(0);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser()
      .from("queue_status")
      .select("now_running, pending_tokens, done_tokens, home_tokens")
      .eq("clinic_id", clinicId)
      .eq("date", date)
      .maybeSingle();
    if (error) {
      setOnline(false);
      return;
    }
    setOnline(true);
    setQ(data ?? { now_running: null, pending_tokens: [], done_tokens: [], home_tokens: [] });
  }, [clinicId, date]);

  useEffect(() => {
    const sb = supabaseBrowser();
    let channel: ReturnType<typeof sb.channel> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    function connect() {
      if (stopped) return;
      channel = sb
        .channel(`q-${clinicId}-${date}-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "queue_status", filter: `clinic_id=eq.${clinicId}` }, (payload: { new: unknown }) => {
          const row = payload.new as Q & { date?: string };
          if (row && row.date === date) setQ({ now_running: row.now_running, pending_tokens: row.pending_tokens ?? [], done_tokens: row.done_tokens ?? [], home_tokens: row.home_tokens ?? [] });
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            retry.current = 0;
            setOnline(true);
            load();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setOnline(false);
            if (channel) sb.removeChannel(channel);
            channel = null;
            const wait = Math.min(30_000, 2000 * 2 ** retry.current++);
            if (timer) clearTimeout(timer);
            timer = setTimeout(connect, wait);
          }
        });
    }

    load();
    connect();
    const poll = setInterval(load, 20_000); // backup for very weak networks
    const onOnline = () => {
      load();
      if (!channel) {
        retry.current = 0;
        if (timer) clearTimeout(timer);
        connect();
      }
    };
    const onVisible = () => document.visibilityState === "visible" && load();
    window.addEventListener("online", onOnline);
    const onOffline = () => setOnline(false);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(poll);
      if (timer) clearTimeout(timer);
      if (channel) sb.removeChannel(channel);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clinicId, date, load]);

  const v = queueView(q, token);
  return (
    <div className="flex flex-col gap-4" data-testid="queue">
      {!online && (
        <p className="rounded-xl bg-amber-100 p-3 text-center text-lg font-semibold text-amber-900" data-testid="reconnecting">
          {t("reconnecting")}
        </p>
      )}
      {v.state === "go_in" && (
        <p className="animate-pulse rounded-2xl bg-green-600 p-5 text-center text-3xl font-black text-white" data-testid="go-in">
          {t("goInNow")}
        </p>
      )}
      {v.state === "soon" && (
        <p className="rounded-2xl bg-amber-400 p-5 text-center text-2xl font-bold text-slate-900" data-testid="soon">
          {t("turnComing")}
        </p>
      )}
      {v.home && v.state !== "done" && v.state !== "go_in" && (
        <p className="rounded-2xl bg-teal-50 p-4 text-center text-lg font-semibold text-teal-900 ring-1 ring-teal-200" data-testid="home-note">
          🏠 {t("homeQueueNote")}
        </p>
      )}
      {v.state === "done" && <p className="ok-box text-center text-2xl">{t("visitDone")}</p>}

      <div className="card text-center">
        <div className="text-xl text-slate-600">{t("nowRunning")}</div>
        <div className="text-[6.5rem] font-black leading-none text-teal-700" data-testid="now-running">
          {q?.now_running ?? "–"}
        </div>
        {q && q.now_running == null && <div className="text-slate-500">{t("queueNotStarted")}</div>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-lg text-slate-600">{t("yourNumber")}</div>
          <div className="text-6xl font-black" data-testid="your-number">{token}</div>
        </div>
        <div className="card text-center">
          <div className="text-lg text-slate-600">{t("patientsAhead")}</div>
          <div className="text-6xl font-black" data-testid="ahead">{v.ahead ?? "–"}</div>
        </div>
      </div>
    </div>
  );
}
