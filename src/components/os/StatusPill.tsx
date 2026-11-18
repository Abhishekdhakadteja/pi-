import type { IntegrationStatus } from "@/lib/integrations";
import type { OsWords } from "@/lib/os-content";

const STYLE: Record<IntegrationStatus, string> = {
  live: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  connected: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  ready: "border-violet-400/40 bg-violet-400/10 text-violet-200",
  soon: "border-violet-400/40 bg-violet-400/10 text-violet-200",
};

/** "चालू" (live), "कनेक्टेड", or "जल्द" (soon). Never shows a non-working feature as live. */
export function StatusPill({ status, w }: { status: IntegrationStatus; w: Pick<OsWords, IntegrationStatus> }) {
  const on = status === "live" || status === "connected";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${STYLE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "os-live-dot bg-emerald-400" : "bg-violet-300"}`} />
      {w[status]}
    </span>
  );
}
