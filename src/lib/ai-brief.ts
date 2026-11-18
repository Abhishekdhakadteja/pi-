// "Agent" logic for the command center and the doctor's patient brief.
// Pure functions over data already in the database: free, instant and testable.
// (The paid Claude summary lives in src/lib/ai.ts and only adds to this.)

import type { OsWords } from "./os-content";

export type Insight = {
  tone: "info" | "warn" | "ok";
  text: string;
  href?: string;
};

export type DayData = {
  statuses: string[];
  paidAppointmentIds: Set<string>;
  doneAppointmentIds: string[];
  medEnding: string[]; // patient names whose course ends within 3 days
  followUpsToday: number;
  pendingMessages: number;
};

export function buildInsights(d: DayData, w: OsWords, canMoney: boolean): Insight[] {
  const out: Insight[] = [];
  const total = d.statuses.length;
  const waiting = d.statuses.filter((s) => s === "waiting" || s === "booked").length;
  const missed = d.statuses.filter((s) => s === "missed").length;
  const unpaid = d.doneAppointmentIds.filter((id) => !d.paidAppointmentIds.has(id)).length;

  if (total === 0) out.push({ tone: "info", text: w.insEmpty, href: "/admin/poster" });
  else if (waiting > 0) out.push({ tone: "info", text: w.insWaiting(waiting), href: "/today" });

  if (d.medEnding.length > 0) {
    const names = d.medEnding.slice(0, 3).join(", ") + (d.medEnding.length > 3 ? "…" : "");
    out.push({ tone: "warn", text: w.insMedEnding(d.medEnding.length, names), href: "/messages" });
  }
  if (d.followUpsToday > 0) out.push({ tone: "info", text: w.insFollowUp(d.followUpsToday), href: "/today" });
  if (d.pendingMessages > 0) out.push({ tone: "warn", text: w.insMessages(d.pendingMessages), href: "/messages" });
  if (missed > 0) out.push({ tone: "warn", text: w.insMissed(missed), href: "/today" });
  if (canMoney && unpaid > 0) out.push({ tone: "warn", text: w.insUnpaid(unpaid), href: "/today" });

  if (out.length === 0) out.push({ tone: "ok", text: total > 0 && waiting === 0 ? w.insAllClear : w.insNoneWaiting });
  return out;
}

export type BriefInput = {
  pastVisits: { date: string; diagnosis: string | null }[]; // newest first
  lastRx: string[]; // medicine names from the most recent earlier prescription
  lastCourseEnd: string | null;
  complaint: string | null;
};

/** A few short, factual lines about the patient in the room. Never guesses a diagnosis. */
export function buildPatientBrief(p: BriefInput, w: OsWords, fmt: (d: string) => string): string[] {
  const lines: string[] = [];
  if (p.complaint?.trim()) lines.push(w.pbToday(p.complaint.trim()));
  if (p.pastVisits.length === 0) {
    lines.push(w.pbFirstVisit);
  } else {
    lines.push(w.pbVisits(p.pastVisits.length, fmt(p.pastVisits[0].date)));
    const dx = p.pastVisits.find((v) => v.diagnosis?.trim())?.diagnosis?.trim();
    if (dx) lines.push(w.pbLastDx(dx));
  }
  if (p.lastRx.length > 0) lines.push(w.pbLastRx(p.lastRx.slice(0, 5).join(", ")));
  if (p.lastCourseEnd) lines.push(w.pbCourse(fmt(p.lastCourseEnd)));
  return lines;
}
