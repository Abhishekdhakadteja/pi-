import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Scripted Claude replies, and a record of each request the loop sends.
const replies: unknown[] = [];
const requests: Record<string, unknown>[] = [];
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = {
      messages: {
        create: async (body: Record<string, unknown>) => {
          requests.push(JSON.parse(JSON.stringify(body)));
          const next = replies.shift();
          if (!next) throw new Error("no scripted reply");
          return next;
        },
      },
    };
  },
}));

const toolCalls: { name: string; input: unknown }[] = [];
vi.mock("@/lib/ai-manager/tools", () => ({
  ToolInputError: class extends Error {},
  runTool: async (_staff: unknown, name: string, input: unknown) => {
    toolCalls.push({ name, input });
    return { appointments_today: 7, by_status: { waiting: 3 } };
  },
}));

import { askManager } from "@/lib/ai-manager/agent";
import type { Staff } from "@/lib/staff";

const staff = {
  id: "u1",
  clinic_id: "c1",
  name: "Sharma",
  role: "attender",
  clinic: { id: "c1", name: "Demo Clinic", slug: "demo", slots_per_day: 40, opening_time: "09:00:00", closing_time: "17:00:00", upi_id: null, default_fee: 300 },
} as Staff;

beforeEach(() => {
  replies.length = 0;
  requests.length = 0;
  toolCalls.length = 0;
});

describe("AI मैनेजर loop", () => {
  it("runs a tool, feeds the result back, and returns the final text", async () => {
    replies.push(
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "clinic_today", input: {} }] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "आज 3 मरीज़ इंतज़ार में हैं।" }] },
    );
    const a = await askManager(staff, [], "आज कितने बाकी हैं?", "hi");
    expect(a.text).toBe("आज 3 मरीज़ इंतज़ार में हैं।");
    expect(a.tools).toEqual(["clinic_today"]);
    expect(toolCalls).toEqual([{ name: "clinic_today", input: {} }]);
    const second = requests[1].messages as { role: string; content: unknown }[];
    expect(second.at(-1)?.role).toBe("user");
    expect(JSON.stringify(second.at(-1)?.content)).toContain("tool_result");
  });

  it("gives the attender only the attender tools", async () => {
    replies.push({ stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] });
    await askManager(staff, [], "hi", "hi");
    const names = (requests[0].tools as { name: string }[]).map((t) => t.name);
    expect(names).toEqual(["clinic_today", "list_appointments", "find_patients"]);
    expect(requests[0].model).toBe("claude-sonnet-5-5");
  });

  it("stops calling tools after the round limit and forces an answer", async () => {
    for (let i = 0; i < 6; i++)
      replies.push({ stop_reason: "tool_use", content: [{ type: "tool_use", id: `t${i}`, name: "clinic_today", input: {} }] });
    replies.push({ stop_reason: "end_turn", content: [{ type: "text", text: "final" }] });
    const a = await askManager(staff, [], "loop", "en");
    expect(a.text).toBe("final");
    expect((requests.at(-1)?.tool_choice as { type: string }).type).toBe("none");
  });

  it("throws on a refusal so the UI shows a friendly error", async () => {
    replies.push({ stop_reason: "refusal", content: [] });
    await expect(askManager(staff, [], "x", "en")).rejects.toThrow("ai_refused");
  });
});
