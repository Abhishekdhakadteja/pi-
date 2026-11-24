import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const KEYS = ["MESSAGING_PROVIDER", "MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_TEMPLATE", "NODE_ENV"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const env = process.env as Record<string, string | undefined>;

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete env[k];
    else env[k] = saved[k];
  }
});

describe("booking OTP is only asked when a code can really be delivered", () => {
  it("is off in the free manual mode and on the live site with MESSAGING_PROVIDER=log", async () => {
    const { smsOtpReady } = await import("@/lib/messaging");
    delete env.MESSAGING_PROVIDER;
    expect(smsOtpReady()).toBe(false);
    env.MESSAGING_PROVIDER = "manual";
    expect(smsOtpReady()).toBe(false);
    env.MESSAGING_PROVIDER = "log";
    env.NODE_ENV = "production";
    expect(smsOtpReady()).toBe(false);
  });
  it("needs every key of the chosen provider", async () => {
    const { smsOtpReady } = await import("@/lib/messaging");
    env.MESSAGING_PROVIDER = "msg91";
    env.MSG91_AUTH_KEY = "k";
    delete env.MSG91_TEMPLATE_ID;
    expect(smsOtpReady()).toBe(false);
    env.MSG91_TEMPLATE_ID = "t";
    expect(smsOtpReady()).toBe(true);
    env.MESSAGING_PROVIDER = "whatsapp";
    env.WHATSAPP_TOKEN = "x";
    env.WHATSAPP_PHONE_NUMBER_ID = "1";
    delete env.WHATSAPP_TEMPLATE;
    expect(smsOtpReady()).toBe(false);
    env.WHATSAPP_TEMPLATE = "reminder";
    expect(smsOtpReady()).toBe(true);
  });
});
