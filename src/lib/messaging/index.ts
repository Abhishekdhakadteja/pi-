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
 * MSG91 SMS — not connected yet. Fill in when you have an MSG91 account
 * (needs DLT-approved templates in India). Keep MESSAGING_PROVIDER=log until then.
 */
export class Msg91Sender implements MessageSender {
  async send(): Promise<SendResult> {
    return { status: "failed", error: "MSG91 is not connected yet" };
  }
}

/** WhatsApp Business (e.g. via Meta Cloud API or a BSP) — not connected yet. */
export class WhatsAppSender implements MessageSender {
  async send(): Promise<SendResult> {
    return { status: "failed", error: "WhatsApp is not connected yet" };
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
