"use client";
import { trackStep } from "@/app/start/actions";
import type { FunnelStep } from "@/lib/funnel";

// Browser side of the journey: an anonymous visitor id and the doctor's answers, kept on the
// doctor's own phone (localStorage) so the result is still there after the demo or the webinar.

const VID = "ce_vid";
const SAVED = "ce_journey";

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function visitorId(): string {
  const s = store();
  let id = s?.getItem(VID) ?? "";
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
    try {
      s?.setItem(VID, id);
    } catch {}
  }
  return id;
}

export function track(step: FunnelStep, ref?: string | null, plan?: string | null) {
  void trackStep(step, visitorId(), ref ?? null, plan ?? null).catch(() => {});
}

export type Saved = { n: number; fee: number; hours: number; pains: string[]; done?: boolean };

export function loadJourney(): Saved | null {
  try {
    const raw = store()?.getItem(SAVED);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export function saveJourney(s: Saved) {
  try {
    store()?.setItem(SAVED, JSON.stringify(s));
  } catch {}
}
