// Staff tracking (Pro, Beta): pure helpers shared by the /api/presence endpoint, the dashboard and
// the tests. No server code here.
//
// How it works: an ESP32 in the clinic scans Bluetooth every ~20 s and posts the tags it saw.
// A tag that belongs to a staff member becomes a "sighting". From the sightings of one day we work
// out first-in, last-seen, time inside and whether the person is in right now.

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/** A tag not seen for this long counts as "out" right now. */
export const IN_NOW_MINUTES = 5;
/** A gap longer than this between two sightings is a break: it is not counted as time inside. */
export const BREAK_GAP_MINUTES = 15;
/** We store at most one sighting per staff member per this many seconds (keeps the table small). */
export const STORE_EVERY_SECONDS = 60;
/** Weaker than this (dBm) is probably outside the clinic or next door: ignored. */
export const DEFAULT_MIN_RSSI = -85;
export const MAX_SIGHTINGS_PER_POST = 60;

// ---------------------------------------------------------------- device tokens

/** A new secret for an ESP32. Shown once to the admin; only its hash is stored. */
export function newNodeToken(): string {
  return `cen_${randomBytes(24).toString("base64url")}`;
}
export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
export function bearerToken(header: string | null): string | null {
  const m = /^Bearer\s+(cen_[A-Za-z0-9_-]{20,64})$/.exec(header?.trim() ?? "");
  return m ? m[1] : null;
}

// ---------------------------------------------------------------- identifiers

const MAC = /^([0-9a-f]{2}[:-]?){5}[0-9a-f]{2}$/i;
const IBEACON = /^([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}):(\d{1,5}):(\d{1,5})$/i;

/**
 * One spelling per tag, so "AA-BB-CC-DD-EE-FF" typed by the admin matches "aa:bb:cc:dd:ee:ff"
 * sent by the ESP32. Accepts a BLE MAC or an iBeacon "uuid:major:minor". Null if neither.
 */
export function normalizeIdentifier(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (MAC.test(s)) {
    const hex = s.replace(/[:-]/g, "");
    return hex.match(/.{2}/g)!.join(":");
  }
  const b = IBEACON.exec(s);
  if (b) {
    const hex = b[1].replace(/-/g, "");
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const major = Number(b[2]);
    const minor = Number(b[3]);
    if (major > 65535 || minor > 65535) return null;
    return `${uuid}:${major}:${minor}`;
  }
  return null;
}

// ---------------------------------------------------------------- the ESP32's post

export const PresencePost = z.object({
  fw: z.string().max(40).optional(),
  sightings: z
    .array(z.object({ id: z.string().min(3).max(80), rssi: z.number().int().min(-127).max(20) }))
    .max(MAX_SIGHTINGS_PER_POST),
});
export type PresencePost = z.infer<typeof PresencePost>;

/** Normalises, drops weak/unknown ones and keeps the strongest reading of each tag. */
export function cleanSightings(post: PresencePost, minRssi = DEFAULT_MIN_RSSI): Map<string, number> {
  const best = new Map<string, number>();
  for (const s of post.sightings) {
    const id = normalizeIdentifier(s.id);
    if (!id || s.rssi < minRssi) continue;
    const prev = best.get(id);
    if (prev === undefined || s.rssi > prev) best.set(id, s.rssi);
  }
  return best;
}

// ---------------------------------------------------------------- daily attendance

export type Sighting = { user_id: string; seen_at: string };
export type DayRow = {
  user_id: string;
  firstIn: string;
  lastSeen: string;
  /** minutes inside, breaks longer than BREAK_GAP_MINUTES not counted */
  minutesIn: number;
  inNow: boolean;
  /** arrived after the shift start + grace */
  late: boolean;
};

const MIN = 60_000;

/**
 * Turns one day's sightings into a row per staff member.
 * `shiftStart` is "HH:MM" India time on `day` (YYYY-MM-DD); `graceMinutes` before marking late.
 */
export function attendanceFromSightings(
  sightings: Sighting[],
  now: Date,
  opts: { day: string; shiftStart: string; graceMinutes?: number },
): DayRow[] {
  const byUser = new Map<string, number[]>();
  for (const s of sightings) {
    const t = Date.parse(s.seen_at);
    if (Number.isNaN(t)) continue;
    const list = byUser.get(s.user_id) ?? [];
    list.push(t);
    byUser.set(s.user_id, list);
  }
  const start = Date.parse(`${opts.day}T${opts.shiftStart.slice(0, 5)}:00+05:30`);
  const grace = (opts.graceMinutes ?? 10) * MIN;
  const rows: DayRow[] = [];
  for (const [user_id, times] of byUser) {
    times.sort((a, b) => a - b);
    let inside = 0;
    for (let i = 1; i < times.length; i++) {
      const gap = times[i] - times[i - 1];
      if (gap <= BREAK_GAP_MINUTES * MIN) inside += gap;
    }
    const first = times[0];
    const last = times[times.length - 1];
    rows.push({
      user_id,
      firstIn: new Date(first).toISOString(),
      lastSeen: new Date(last).toISOString(),
      minutesIn: Math.round(inside / MIN),
      inNow: now.getTime() - last <= IN_NOW_MINUTES * MIN,
      late: !Number.isNaN(start) && first > start + grace,
    });
  }
  return rows.sort((a, b) => a.firstIn.localeCompare(b.firstIn));
}

/** "6 घं 20 मि" / "6h 20m" */
export function hoursLabel(minutes: number, lang: "hi" | "en"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return lang === "hi" ? `${h} घं ${m} मि` : `${h}h ${m}m`;
}

/** Is a node healthy? It posts every ~20-30 s, so 3 minutes of silence means offline. */
export function nodeOnline(lastSeenAt: string | null, now: Date): boolean {
  return !!lastSeenAt && now.getTime() - Date.parse(lastSeenAt) <= 3 * MIN;
}
