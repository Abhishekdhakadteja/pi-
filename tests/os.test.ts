import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { INTEGRATIONS, getIntegration, integrationStatus } from "@/lib/integrations";
import { buildInsights, buildPatientBrief } from "@/lib/ai-brief";
import { CARD_WORDS, getOsWords } from "@/lib/os-content";
import { getDict, LANGS } from "@/lib/i18n";

const hi = getOsWords("hi");

describe("AI services hub", () => {
  it("never shows a paid or roadmap service as live", () => {
    for (const i of INTEGRATIONS) {
      const s = integrationStatus(i, {});
      if (i.kind === "free") expect(s).toBe("live");
      else expect(s === "ready" || s === "soon").toBe(true);
    }
  });
  it("switches Claude on only when the key is set", () => {
    const c = getIntegration("claude");
    expect(integrationStatus(c, {})).toBe("ready");
    expect(integrationStatus(c, { ANTHROPIC_API_KEY: "  " })).toBe("ready");
    expect(integrationStatus(c, { ANTHROPIC_API_KEY: "sk-x" })).toBe("connected");
  });
  it("needs both the keys and MESSAGING_PROVIDER for SMS", () => {
    const m = getIntegration("msg91");
    const keys = { MSG91_AUTH_KEY: "a", MSG91_TEMPLATE_ID: "b" };
    expect(integrationStatus(m, keys)).toBe("ready");
    expect(integrationStatus(m, { ...keys, MESSAGING_PROVIDER: "msg91" })).toBe("connected");
  });
  it("has text and steps in both languages for every service", () => {
    for (const i of INTEGRATIONS) {
      for (const l of LANGS) {
        expect(i.title[l]).toBeTruthy();
        expect(i.body[l]).toBeTruthy();
        expect(i.cost[l]).toBeTruthy();
        if (i.kind !== "free") expect(i.steps[l].length).toBeGreaterThan(0);
      }
    }
  });
  it("has every card word and the nav label in both languages", () => {
    for (const l of LANGS) {
      const w = getOsWords(l);
      for (const k of CARD_WORDS) expect(w[k]).toBeTruthy();
      expect(getDict(l).aiCenter).toBeTruthy();
    }
  });
});

describe("AI brief insights", () => {
  const base = { statuses: [] as string[], paidAppointmentIds: new Set<string>(), doneAppointmentIds: [] as string[], medEnding: [] as string[], followUpsToday: 0, pendingMessages: 0 };
  it("says the day is empty and points to the QR poster", () => {
    const r = buildInsights(base, hi, true);
    expect(r[0].text).toBe(hi.insEmpty);
    expect(r[0].href).toBe("/admin/poster");
  });
  it("lists waiting, medicine ending, messages, missed and unpaid", () => {
    const r = buildInsights(
      { ...base, statuses: ["waiting", "booked", "done", "missed"], doneAppointmentIds: ["a"], medEnding: ["Ram", "Sita", "Mohan", "Geeta"], followUpsToday: 2, pendingMessages: 3 },
      hi,
      true,
    );
    const text = r.map((i) => i.text).join("\n");
    expect(text).toContain(hi.insWaiting(2));
    expect(text).toContain("Ram, Sita, Mohan…");
    expect(text).toContain(hi.insMessages(3));
    expect(text).toContain(hi.insMissed(1));
    expect(text).toContain(hi.insUnpaid(1));
  });
  it("hides money hints from the attender", () => {
    const r = buildInsights({ ...base, statuses: ["done"], doneAppointmentIds: ["a"] }, hi, false);
    expect(r.map((i) => i.text)).not.toContain(hi.insUnpaid(1));
  });
  it("says all clear when everyone is seen and paid", () => {
    const r = buildInsights({ ...base, statuses: ["done"], doneAppointmentIds: ["a"], paidAppointmentIds: new Set(["a"]) }, hi, true);
    expect(r).toEqual([{ tone: "ok", text: hi.insAllClear }]);
  });
});

describe("patient brief", () => {
  const fmt = (d: string) => d;
  it("marks a first visit", () => {
    expect(buildPatientBrief({ pastVisits: [], lastRx: [], lastCourseEnd: null, complaint: null }, hi, fmt)).toEqual([hi.pbFirstVisit]);
  });
  it("summarises visits, last diagnosis, medicines and course", () => {
    const lines = buildPatientBrief(
      {
        pastVisits: [
          { date: "2026-11-01", diagnosis: null },
          { date: "2026-10-01", diagnosis: "Typhoid" },
        ],
        lastRx: ["Paracetamol", "ORS"],
        lastCourseEnd: "2026-11-08",
        complaint: "बुखार",
      },
      hi,
      fmt,
    );
    expect(lines).toEqual([hi.pbToday("बुखार"), hi.pbVisits(2, "2026-11-01"), hi.pbLastDx("Typhoid"), hi.pbLastRx("Paracetamol, ORS"), hi.pbCourse("2026-11-08")]);
  });
});

describe("paid message senders (ready, key only)", async () => {
  const { Msg91Sender, WhatsAppSender } = await import("@/lib/messaging");
  const msg = { to: "9876543210", channel: "sms" as const, body: "नमस्ते\nदवा खत्म", purpose: "reminder" as const };

  it("refuses to send without keys", async () => {
    expect((await new Msg91Sender("", "").send(msg)).status).toBe("failed");
    expect((await new WhatsAppSender("", "", "").send(msg)).status).toBe("failed");
  });
  it("calls the MSG91 flow API with the number and text", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ type: "success", message: "req1" }), { status: 200 }));
    const r = await new Msg91Sender("key", "tpl", f as unknown as typeof fetch).send(msg);
    expect(r).toEqual({ status: "sent", providerRef: "req1" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://control.msg91.com/api/v5/flow");
    expect((init.headers as Record<string, string>).authkey).toBe("key");
    expect(JSON.parse(String(init.body)).recipients[0]).toEqual({ mobiles: "919876543210", message: msg.body });
  });
  it("reports an MSG91 error", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ type: "error", message: "bad template" }), { status: 200 }));
    expect((await new Msg91Sender("k", "t", f as unknown as typeof fetch).send(msg)).status).toBe("failed");
  });
  it("sends a WhatsApp template with the text as one line", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }));
    const r = await new WhatsAppSender("tok", "123", "reminder", "hi", f as unknown as typeof fetch).send(msg);
    expect(r).toEqual({ status: "sent", providerRef: "wamid.1" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/123/messages");
    const body = JSON.parse(String(init.body));
    expect(body.to).toBe("919876543210");
    expect(body.template.name).toBe("reminder");
    expect(body.template.components[0].parameters[0].text).toBe("नमस्ते दवा खत्म");
  });
});
