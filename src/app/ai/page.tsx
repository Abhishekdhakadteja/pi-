import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { cardWords, getOsWords } from "@/lib/os-content";
import { INTEGRATIONS, integrationStatus } from "@/lib/integrations";
import { AiBrief } from "@/components/os/AiBrief";
import { IntegrationCard } from "@/components/os/IntegrationCard";
import { LogoTile } from "@/components/os/LogoTile";
import { StatusPill } from "@/components/os/StatusPill";
import { getPlanState } from "@/lib/subscription";
import { isProService } from "@/lib/plans";
import { getProWords } from "@/lib/pro-content";
import { ProBadge } from "@/components/ProBadge";
import Link from "next/link";
import { KnowledgeForm } from "@/components/os/KnowledgeForm";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// AI Command Center: today's brief, the agents that run the clinic, and the paid AI services
// that are coded and waiting only for a key ("Connect") or on the roadmap ("Join").
export default async function AiCenterPage() {
  const staff = await requireRole(["attender", "doctor", "admin"]);
  const { lang } = await getT();
  const w = getOsWords(lang);
  const cw = cardWords(w);
  const pw = getProWords(lang);
  const plan = await getPlanState(staff.clinic_id);
  const env = process.env as Record<string, string | undefined>;
  const canTeach = plan.pro && (staff.role === "admin" || staff.role === "doctor");
  let knowledge = "";
  if (canTeach) {
    const { data } = await supabaseAdmin().from("clinics").select("ai_knowledge").eq("id", staff.clinic_id).maybeSingle();
    knowledge = ((data as { ai_knowledge?: string | null } | null)?.ai_knowledge ?? "") || "";
  }
  const agents = INTEGRATIONS.filter((i) => i.kind === "free");
  const services = INTEGRATIONS.filter((i) => i.kind !== "free")
    .map((i) => ({ i, s: integrationStatus(i, env) }))
    // connected first, then key-ready, then roadmap
    .sort((a, b) => ["connected", "ready", "soon"].indexOf(a.s) - ["connected", "ready", "soon"].indexOf(b.s));

  return (
    <StaffShell staff={staff}>
      <header className="mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-brand text-[11px] font-bold tracking-[0.25em] text-cyan-200">
          <span className="os-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {w.osBadge}
        </span>
        <h1 className="mt-3 text-3xl font-bold">
          <span className="os-gradient-text">{w.centerTitle}</span>
        </h1>
        <p className="mt-1 text-slate-400">{w.centerSub}</p>
      </header>

      <AiBrief staff={staff} lang={lang} />

      <section className="mt-6" data-testid="agents">
        <h2 className="text-xl font-bold">{w.agentsTitle}</h2>
        <p className="mb-3 text-sm text-slate-400">{w.agentsSub}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {agents.map((a) => (
            <li key={a.id} className="card flex items-start gap-3 p-3" data-testid={`agent-${a.id}`}>
              <LogoTile icon={a.icon} accent={a.accent} size="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white">{a.title[lang]}</span>
                  {!plan.pro && isProService(a.id) ? (
                    <Link href="/pro" className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-bold text-amber-200" data-testid={`agent-lock-${a.id}`}>
                      🔒 {pw.agentLocked}
                    </Link>
                  ) : (
                    <StatusPill status="live" w={w} />
                  )}
                </div>
                <p className="mt-0.5 text-sm leading-snug text-slate-400">{a.body[lang]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {canTeach && <KnowledgeForm initial={knowledge} />}

      <section className="mt-8" data-testid="services">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          {w.hubTitle} <ProBadge label={plan.trial ? "TRIAL" : plan.tier === "pro_max" ? "MAX" : "PRO"} />
        </h2>
        <p className="mb-3 text-sm text-slate-400">{w.hubSub}</p>
        {!plan.pro && (
          <Link
            href="/pro"
            className="pro-card-hero mb-4 flex items-center justify-between gap-3 rounded-2xl p-4"
            data-testid="pro-upsell"
          >
            <span>
              <span className="block text-lg font-bold">
                <span className="pro-text">{pw.unlockTitle}</span>
              </span>
              <span className="block text-sm text-slate-300">{pw.unlockSub}</span>
            </span>
            <span className="btn-small shrink-0 bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500 font-bold text-[#140a24]">
              {pw.unlock} →
            </span>
          </Link>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {services.map(({ i, s }) => (
            <IntegrationCard
              key={i.id}
              item={i}
              status={s}
              w={cw}
              lang={lang}
              isAdmin={staff.role === "admin"}
              locked={!plan.pro && isProService(i.id)}
              unlockLabel={pw.unlock}
            />
          ))}
        </ul>
      </section>
    </StaffShell>
  );
}
