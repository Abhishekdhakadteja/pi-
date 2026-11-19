import Link from "next/link";
import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { getPlanState } from "@/lib/subscription";
import { todayIST } from "@/lib/dates";
import { attendanceFromSightings, hoursLabel, nodeOnline } from "@/lib/presence";
import { getProWords } from "@/lib/pro-content";
import { AddDeviceForm, AddNodeForm, NodeToggle, RemoveDevice } from "./TrackingForms";
import { trackWords } from "./words";

export const dynamic = "force-dynamic";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Staff tracking dashboard (Pro, Beta): today's attendance from the ESP32 nodes, the nodes'
// health, and which Bluetooth tag belongs to whom.
export default async function TrackingPage() {
  const staff = await requireRole(["admin"]);
  const { lang } = await getT();
  const w = trackWords(lang);
  const plan = await getPlanState(staff.clinic_id);

  const header = (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">
        {w.title} <span className="ml-2 rounded-full border border-cyan-400/40 px-2 py-0.5 align-middle text-xs text-cyan-200">{w.beta}</span>
      </h1>
      <p className="mt-1 text-slate-400">{w.sub}</p>
    </header>
  );

  if (!plan.pro) {
    return (
      <StaffShell staff={staff}>
        {header}
        <Link href="/pro" className="pro-card-hero flex items-center justify-between gap-3 rounded-2xl p-4" data-testid="tracking-locked">
          <span className="font-bold">🔒 {w.locked}</span>
          <span className="btn-small shrink-0">{getProWords(lang).unlock} →</span>
        </Link>
      </StaffShell>
    );
  }

  const supabase = await supabaseServer();
  const day = todayIST();
  const [nodesQ, devicesQ, eventsQ, usersQ] = await Promise.all([
    supabase.from("presence_nodes").select("id, name, active, last_seen_at, firmware").eq("clinic_id", staff.clinic_id).order("created_at"),
    supabase.from("staff_devices").select("id, user_id, kind, identifier, label").eq("clinic_id", staff.clinic_id).order("created_at"),
    supabase
      .from("staff_presence_events")
      .select("user_id, seen_at")
      .eq("clinic_id", staff.clinic_id)
      .gte("seen_at", `${day}T00:00:00+05:30`)
      .order("seen_at")
      .limit(5000),
    supabase.from("users").select("id, name").eq("clinic_id", staff.clinic_id).eq("active", true).order("name"),
  ]);
  const dbMissing = !!nodesQ.error && (nodesQ.error.code === "42P01" || /does not exist|schema cache/i.test(nodesQ.error.message));
  const names = new Map((usersQ.data ?? []).map((u) => [u.id as string, u.name as string]));
  const now = new Date();
  const rows = attendanceFromSightings(eventsQ.data ?? [], now, { day, shiftStart: staff.clinic.opening_time ?? "09:00" });

  return (
    <StaffShell staff={staff}>
      {header}
      {dbMissing && <p className="error-box mb-4">{w.dbMissing}</p>}

      <section className="card mb-4" data-testid="tracking-today">
        <h2 className="mb-2 text-xl font-bold">{w.today}</h2>
        {rows.length === 0 ? (
          <p className="text-slate-400">{w.noneToday}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {rows.map((r) => (
              <li key={r.user_id} className="flex items-center gap-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.inNow ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {names.get(r.user_id) ?? "—"} {r.late && <span className="ml-1 text-xs text-amber-300">{w.late}</span>}
                  </span>
                  <span className="block text-sm text-slate-400">
                    {w.firstIn} {time(r.firstIn)} · {w.lastSeen} {time(r.lastSeen)} · {w.hours} {hoursLabel(r.minutesIn, lang)}
                  </span>
                </span>
                <span className={`text-sm font-bold ${r.inNow ? "text-emerald-300" : "text-slate-400"}`}>{r.inNow ? w.inNow : w.out}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl font-bold">{w.nodes}</h2>
        {(nodesQ.data ?? []).length === 0 && <p className="mb-2 text-slate-400">{w.noNodes}</p>}
        <ul className="mb-3 flex flex-col divide-y divide-white/10">
          {(nodesQ.data ?? []).map((n) => {
            const on = n.active && nodeOnline(n.last_seen_at, now);
            return (
              <li key={n.id} className="flex items-center gap-3 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{n.name}</span>
                  <span className="block text-sm text-slate-400">
                    {n.last_seen_at ? `${on ? w.online : w.offline} · ${time(n.last_seen_at)}` : w.never}
                    {n.firmware && ` · ${n.firmware}`}
                  </span>
                </span>
                <NodeToggle id={n.id} active={n.active} />
              </li>
            );
          })}
        </ul>
        <AddNodeForm />
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl font-bold">{w.devices}</h2>
        {(devicesQ.data ?? []).length === 0 && <p className="mb-2 text-slate-400">{w.noDevices}</p>}
        <ul className="mb-3 flex flex-col divide-y divide-white/10">
          {(devicesQ.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{names.get(d.user_id) ?? "—"} · {w.kind[d.kind] ?? d.kind}</span>
                <span className="block truncate font-mono text-xs text-slate-400">{d.identifier}{d.label && ` · ${d.label}`}</span>
              </span>
              <RemoveDevice id={d.id} />
            </li>
          ))}
        </ul>
        <AddDeviceForm staff={(usersQ.data ?? []).map((u) => ({ id: u.id as string, name: u.name as string }))} />
      </section>

      <section className="card">
        <h2 className="mb-2 text-xl font-bold">{w.setupTitle}</h2>
        <ol className="list-decimal space-y-1 pl-5 text-slate-300">
          {w.setup.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-slate-400">🔐 {w.privacy}</p>
      </section>
    </StaffShell>
  );
}
