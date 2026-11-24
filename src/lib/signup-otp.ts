import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server-env";
import { getSender, smsOtpReady } from "@/lib/messaging";

// One-time codes for doctor sign-up. Each way of sending switches on by itself when its key is set
// on Netlify, the same as the other paid services:
//   Email:  BREVO_API_KEY (free 300 emails/day) or RESEND_API_KEY, plus SIGNUP_EMAIL_FROM.
//   Mobile: MESSAGING_PROVIDER=whatsapp or msg91 with its keys (see src/lib/messaging).
// With none set, sign-up still works for free: the Clinic Easy team checks the doctor on WhatsApp
// and switches the account on from the /owner page.

export const OTP_TTL_MIN = 10;
export const MAX_ATTEMPTS = 5;
export const MAX_SENDS_PER_10_MIN = 3;

export function emailOtpReady(): boolean {
  return !!process.env.SIGNUP_EMAIL_FROM?.trim() && !!(process.env.BREVO_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim());
}

export function mobileOtpReady(): boolean {
  return smsOtpReady();
}

export function availableChannels() {
  return { email: emailOtpReady(), mobile: mobileOtpReady() };
}

export function newCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashSignupCode(target: string, code: string): string {
  return createHash("sha256").update(`signup:${target}:${code}:${serverEnv.patientSessionSecret()}`).digest("hex");
}

export function codeMatches(target: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashSignupCode(target, code));
  const b = Buffer.from(storedHash);
  const demo = serverEnv.demoOtp(); // development only, never in production
  return (a.length === b.length && timingSafeEqual(a, b)) || (demo !== null && code === demo);
}

export type EmailPurpose = "signup" | "reset";

function emailContent(purpose: EmailPurpose, code: string) {
  if (purpose === "reset") {
    return {
      subject: `Clinic Easy password reset OTP: ${code}`,
      text: `आपका Clinic Easy पासवर्ड रीसेट OTP: ${code}\nYour Clinic Easy password reset code: ${code}\n\n${OTP_TTL_MIN} मिनट तक मान्य। किसी को न बताएँ, Clinic Easy टीम भी कभी OTP नहीं माँगती।\nअगर आपने password रीसेट नहीं माँगा, तो यह ईमेल अनदेखा करें, आपका password नहीं बदलेगा।`,
      html: `<div style="font-family:sans-serif;font-size:16px"><p>आपका Clinic Easy पासवर्ड रीसेट OTP / Your password reset code:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>${OTP_TTL_MIN} मिनट तक मान्य। किसी को न बताएँ, Clinic Easy टीम भी कभी OTP नहीं माँगती।</p><p style="color:#64748b">अगर आपने password रीसेट नहीं माँगा, तो यह ईमेल अनदेखा करें, आपका password नहीं बदलेगा।<br/>If you did not ask for this, ignore this email; your password stays the same.</p></div>`,
    };
  }
  return {
    subject: `Clinic Easy OTP: ${code}`,
    text: `आपका Clinic Easy रजिस्ट्रेशन OTP: ${code}\nYour Clinic Easy sign-up code: ${code}\n\n${OTP_TTL_MIN} मिनट तक मान्य। किसी को न बताएँ।`,
    html: `<div style="font-family:sans-serif;font-size:16px"><p>आपका Clinic Easy रजिस्ट्रेशन OTP / Your sign-up code:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>${OTP_TTL_MIN} मिनट तक मान्य। किसी को न बताएँ।</p></div>`,
  };
}

/** Emails a 6-digit code through Brevo (or Resend). False when not set up or the provider refused. */
export async function sendCodeEmail(to: string, code: string, purpose: EmailPurpose = "signup", fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!emailOtpReady()) return false;
  const from = process.env.SIGNUP_EMAIL_FROM!.trim();
  const { subject, text, html } = emailContent(purpose, code);
  try {
    if (process.env.BREVO_API_KEY?.trim()) {
      const res = await fetcher("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY.trim(), "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { email: from, name: "Clinic Easy" }, to: [{ email: to }], subject, textContent: text, htmlContent: html }),
      });
      if (!res.ok) console.error(`${purpose} email (Brevo) failed`, res.status);
      return res.ok;
    }
    const res = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `Clinic Easy <${from}>`, to: [to], subject, text, html }),
    });
    if (!res.ok) console.error(`${purpose} email (Resend) failed`, res.status);
    return res.ok;
  } catch (e) {
    console.error(`${purpose} email failed`, e instanceof Error ? e.message : e);
    return false;
  }
}

/** Sends the code. Returns false if the provider refused, so the caller can fall back to the team check. */
export async function sendSignupCode(channel: "email" | "mobile", target: string, code: string): Promise<boolean> {
  if (channel === "email") return sendCodeEmail(target, code, "signup");
  const res = await getSender().send({
    to: target,
    channel: serverEnv.messagingProvider() === "whatsapp" ? "whatsapp" : "sms",
    purpose: "otp",
    body: `${code} is your Clinic Easy sign-up OTP. Valid ${OTP_TTL_MIN} min. Do not share it.`,
  });
  return res.status === "sent" || res.status === "logged";
}
