import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PresencePost,
  attendanceFromSightings,
  bearerToken,
  cleanSightings,
  hashToken,
  hoursLabel,
  newNodeToken,
  nodeOnline,
  normalizeIdentifier,
} from "@/lib/presence";
import { MAX_SERVICES, PRO_SERVICES, aiAllowed, canUse, isProService, maxAllowed, planState, requiredPlan } from "@/lib/plans";
import { INTEGRATIONS } from "@/lib/integrations";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? filesUnder(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });
}

describe("AI is Pro-only (Basic costs ₹0 in AI)", () => {
  it("Basic never allows AI, a trial or paid Pro does", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    expect(aiAllowed(planState(null, now))).toBe(false);
    expect(aiAllowed(planState({ plan: "basic", pro_trial_ends_at: "2026-11-25T00:00:00Z", pro_trial_used: true }, now))).toBe(true);
    expect(aiAllowed(planState({ plan: "pro", plan_until: "2026-11-18T00:00:00Z" }, now))).toBe(false); // expired
  });

  it("every AI-looking agent and the new automation services are Pro", () => {
    for (const id of ["auto_brief", "voice_typing", "claude", "staff_tracking", "smartwatch"] as const) {
      expect(isProService(id)).toBe(true);
    }
    for (const id of ["booking", "queue", "wa_link", "rx", "upi"] as const) expect(isProService(id)).toBe(false);
    for (const id of PRO_SERVICES) expect(INTEGRATIONS.some((i) => i.id === id)).toBe(true);
  });

  it("every server file that calls Claude goes through requireProAI first", () => {
    const callers = filesUnder("src").filter((f) => {
      if (/src\/lib\/(ai\.ts|ai-guard\.ts|scribe\.ts|ai-manager\/)/.test(f)) return false;
      const s = readFileSync(f, "utf8");
      return /\b(summarizePatient|askManager|draftPrescription)\s*\(/.test(s);
    });
    expect(callers.length).toBeGreaterThanOrEqual(2);
    for (const f of callers) {
      const s = readFileSync(f, "utf8");
      const gate = s.indexOf("requireProAI(");
      const call = Math.min(...["summarizePatient(", "askManager("].map((k) => s.indexOf(k, s.indexOf("await import")) ).filter((i) => i > 0));
      expect(gate, f).toBeGreaterThan(0);
      expect(gate, f).toBeLessThan(call);
    }
  });
});

describe("three plans: Basic, Pro, Pro Max", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const basic = planState(null, now);
  const trial = planState({ plan: "basic", pro_trial_ends_at: "2026-11-25T00:00:00Z", pro_trial_used: true }, now);
  const pro = planState({ plan: "pro", plan_until: "2026-12-19T00:00:00Z" }, now);
  const max = planState({ plan: "pro_max", plan_until: "2026-12-19T00:00:00Z" }, now);

  it("ESP32 tracking and the doctor health report need Pro Max", () => {
    expect([...MAX_SERVICES].sort()).toEqual(["smartwatch", "staff_tracking"]);
    for (const id of MAX_SERVICES) {
      expect(requiredPlan(id)).toBe("pro_max");
      expect(canUse(id, basic)).toBe(false);
      expect(canUse(id, trial)).toBe(false);
      expect(canUse(id, pro)).toBe(false);
      expect(canUse(id, max)).toBe(true);
    }
    expect(maxAllowed(pro)).toBe(false);
    expect(maxAllowed(max)).toBe(true);
  });

  it("the AI Manager (claude) is Pro and Pro Max; Basic tools stay open", () => {
    expect(requiredPlan("claude")).toBe("pro");
    expect(canUse("claude", basic)).toBe(false);
    expect(canUse("claude", pro)).toBe(true);
    expect(canUse("claude", max)).toBe(true);
    expect(canUse("booking", basic)).toBe(true);
  });
});

describe("staff tracking helpers", () => {
  it("normalises MACs and iBeacon ids to one spelling", () => {
    expect(normalizeIdentifier("AA-BB-CC-DD-EE-FF")).toBe("aa:bb:cc:dd:ee:ff");
    expect(normalizeIdentifier("aabbccddeeff")).toBe("aa:bb:cc:dd:ee:ff");
    expect(normalizeIdentifier("FDA50693A4E24FB1AFCFC6EB07647825:10001:7")).toBe("fda50693-a4e2-4fb1-afcf-c6eb07647825:10001:7");
    expect(normalizeIdentifier("fda50693-a4e2-4fb1-afcf-c6eb07647825:70000:1")).toBeNull();
    expect(normalizeIdentifier("hello")).toBeNull();
  });

  it("tokens: random, hashed, and only well-formed bearer headers are accepted", () => {
    const a = newNodeToken();
    expect(a).toMatch(/^cen_/);
    expect(a).not.toBe(newNodeToken());
    expect(hashToken(a)).toHaveLength(64);
    expect(bearerToken(`Bearer ${a}`)).toBe(a);
    expect(bearerToken("Bearer abc")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });

  it("drops weak and junk sightings and keeps the strongest reading", () => {
    const post = PresencePost.parse({
      sightings: [
        { id: "AA:BB:CC:DD:EE:FF", rssi: -70 },
        { id: "aa-bb-cc-dd-ee-ff", rssi: -60 },
        { id: "11:22:33:44:55:66", rssi: -95 },
        { id: "not-a-tag", rssi: -40 },
      ],
    });
    expect([...cleanSightings(post)]).toEqual([["aa:bb:cc:dd:ee:ff", -60]]);
    expect(() => PresencePost.parse({ sightings: Array(61).fill({ id: "aa:bb:cc:dd:ee:ff", rssi: -50 }) })).toThrow();
  });

  it("works out arrival, time inside (breaks excluded), late and in-now", () => {
    const day = "2026-11-19";
    const at = (hhmm: string) => `${day}T${hhmm}:00+05:30`;
    const sightings = [
      // Asha: 09:05 to 10:00 every 5 min, then a 1-hour break, back 11:00-11:30
      ...["09:05", "09:10", "09:15", "09:20", "09:25", "09:30", "09:35", "09:40", "09:45", "09:50", "09:55", "10:00"].map((t) => ({ user_id: "asha", seen_at: at(t) })),
      ...["11:00", "11:10", "11:20", "11:30"].map((t) => ({ user_id: "asha", seen_at: at(t) })),
      // Ravi: came 09:40 (late), still in
      ...["09:40", "09:50", "11:28"].map((t) => ({ user_id: "ravi", seen_at: at(t) })),
    ];
    const now = new Date(at("11:31"));
    const rows = attendanceFromSightings(sightings, now, { day, shiftStart: "09:00", graceMinutes: 10 });
    const asha = rows.find((r) => r.user_id === "asha")!;
    const ravi = rows.find((r) => r.user_id === "ravi")!;
    expect(rows[0].user_id).toBe("asha");
    expect(asha.minutesIn).toBe(55 + 30);
    expect(asha.late).toBe(false);
    expect(asha.inNow).toBe(true);
    expect(ravi.late).toBe(true);
    expect(ravi.minutesIn).toBe(10);
    expect(hoursLabel(85, "hi")).toBe("1 घं 25 मि");
    expect(hoursLabel(85, "en")).toBe("1h 25m");
  });

  it("a node is online only if it posted in the last 3 minutes", () => {
    const now = new Date("2026-11-19T06:00:00Z");
    expect(nodeOnline("2026-11-19T05:58:30Z", now)).toBe(true);
    expect(nodeOnline("2026-11-19T05:50:00Z", now)).toBe(false);
    expect(nodeOnline(null, now)).toBe(false);
  });
});
