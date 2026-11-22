import { describe, expect, it } from "vitest";
import { classifyAiError } from "@/lib/ai-errors";

describe("AI failure kinds", () => {
  it("spots an empty budget / spend limit", () => {
    expect(classifyAiError({ status: 400, message: "Your credit balance is too low to access the Anthropic API." })).toBe("budget");
    expect(classifyAiError({ status: 400, error: { error: { type: "invalid_request_error", message: "You have reached your specified API usage limits." } } })).toBe("budget");
  });
  it("spots busy, timeout and bad key", () => {
    expect(classifyAiError({ status: 529, message: "Overloaded" })).toBe("busy");
    expect(classifyAiError({ status: 429, message: "rate_limit_error" })).toBe("busy");
    expect(classifyAiError({ name: "APIConnectionTimeoutError", message: "Request timed out." })).toBe("timeout");
    expect(classifyAiError({ status: 401, message: "invalid x-api-key" })).toBe("key");
  });
  it("anything else is other", () => {
    expect(classifyAiError(new Error("boom"))).toBe("other");
    expect(classifyAiError(null)).toBe("other");
  });
});
