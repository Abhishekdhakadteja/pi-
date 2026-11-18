import "server-only";
import { serverEnv } from "@/lib/server-env";

// One small interface for every message the app sends (OTP and reminders).
// To switch providers later, add a class below and select it with MESSAGING_PROVIDER.

export type Channel = "sms" | "whatsapp";
export type OutgoingMessage = { to: string; channel: Channel; body: string; purpose: "otp" | "reminder" };
export type SendResult = { status: "sent" | "logged" | "manual" | "failed"; providerRef?: string; error?: string };

export interface MessageSender {
  send(msg: OutgoingMessage): Promise<SendResult>;
}

/**
 * FREE default: nothing is sent automatically. The message is saved and the clinic staff send it
 * with ONE tap on the "Messages" page, which opens their own WhatsApp with the text filled in
 * (wa.me link). No API, no per-message cost.
 */
export class ManualWhatsAppSender implements MessageSender {
  async send(msg: OutgoingMessage): Promise<SendResult> {
    console.log(`[message:manual:${msg.purpose}] queued for one-tap WhatsApp to +91${msg.to}`);
    return { status: "manual" };
  }
}

/** Development only: prints the message to the server log. */
export class LogSender implements MessageSender {
  async send(msg: OutgoingMessage): Promise<SendResult> {
    console.log(`[message:${msg.channel}:${msg.purpose}] to +91${msg.to}: ${msg.body}`);
    return { status: "logged" };
  }
}

/**
 * MSG91 SMS (Flow API). Ready to use: set MSG91_AUTH_KEY, MSG91_TEMPLATE_ID and
 * MESSAGING_PROVIDER=msg91 in Netlify. The DLT-approved template must have one variable
 * named "message" (##message##); the whole reminder text goes into it.
 */
export class Msg91Sender implements MessageSender {
  constructor(
    private authKey = process.env.MSG91_AUTH_KEY ?? "",
    private templateId = process.env.MSG91_TEMPLATE_ID ?? "",
    private fetcher: typeof fetch = fetch,
  ) {}
  async send(msg: OutgoingMessage): Promise<SendResult> {
    if (!this.authKey || !this.templateId) return { status: "failed", error: "MSG91 is not connected yet" };
    try {
      const res = await this.fetcher("https://control.msg91.com/api/v5/flow", {
        method: "POST",
        headers: { authkey: this.authKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          template_id: this.templateId,
          short_url: "0",
          recipients: [{ mobiles: `91${msg.to}`, message: msg.body.slice(0, 900) }],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
      if (!res.ok || data.type === "error") return { status: "failed", error: `MSG91: ${data.message ?? res.status}` };
      return { status: "sent", providerRef: data.message };
    } catch (e) {
      return { status: "failed", error: `MSG91: ${e instanceof Error ? e.message : "network"}` };
    }
  }
}

/**
 * WhatsApp Business (Meta Cloud API). Ready to use: set WHATSAPP_TOKEN,
 * WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE and MESSAGING_PROVIDER=whatsapp.
 * Business-started chats must use an approved template; ours has one body variable {{1}}.
 */
export class WhatsAppSender implements MessageSender {
  constructor(
    private token = process.env.WHATSAPP_TOKEN ?? "",
    private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    private template = process.env.WHATSAPP_TEMPLATE ?? "",
    private language = process.env.WHATSAPP_TEMPLATE_LANG ?? "hi",
    private fetcher: typeof fetch = fetch,
  ) {}
  async send(msg: OutgoingMessage): Promise<SendResult> {
    if (!this.token || !this.phoneNumberId || !this.template)
      return { status: "failed", error: "WhatsApp is not connected yet" };
    try {
      const res = await this.fetcher(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `91${msg.to}`,
          type: "template",
          template: {
            name: this.template,
            language: { code: this.language },
            components: [{ type: "body", parameters: [{ type: "text", text: msg.body.replace(/\s*\n+\s*/g, " ").slice(0, 1000) }] }],
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
      if (!res.ok || !data.messages?.[0]) return { status: "failed", error: `WhatsApp: ${data.error?.message ?? res.status}` };
      return { status: "sent", providerRef: data.messages[0].id };
    } catch (e) {
      return { status: "failed", error: `WhatsApp: ${e instanceof Error ? e.message : "network"}` };
    }
  }
}

export function getSender(): MessageSender {
  switch (serverEnv.messagingProvider()) {
    case "msg91":
      return new Msg91Sender();
    case "whatsapp":
      return new WhatsAppSender();
    case "log":
      // On the live site "log" would silently drop reminders, so it falls back to one-tap WhatsApp.
      return process.env.NODE_ENV === "production" ? new ManualWhatsAppSender() : new LogSender();
    default:
      return new ManualWhatsAppSender();
  }
}
