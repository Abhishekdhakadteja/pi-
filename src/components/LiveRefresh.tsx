"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useT } from "./LangProvider";

/** Re-renders the page whenever today's queue changes (Supabase realtime). Falls back to polling. */
export function LiveRefresh({ clinicId, date }: { clinicId: string; date: string }) {
  const router = useRouter();
  const { t } = useT();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`queue-${clinicId}-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_status", filter: `clinic_id=eq.${clinicId}` },
        () => router.refresh(),
      )
      .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    const poll = setInterval(() => router.refresh(), 30_000);
    return () => {
      clearInterval(poll);
      sb.removeChannel(channel);
    };
  }, [clinicId, date, router]);

  return (
    <span className={`inline-flex items-center gap-1 text-sm ${connected ? "text-green-700" : "text-amber-700"}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-600" : "bg-amber-500"}`} />
      {connected ? t("live") : t("reconnecting")}
    </span>
  );
}
