import "server-only";

// Server-only secrets. Importing this file from a client component fails the build.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export const serverEnv = {
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  appUrl: () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  patientSessionSecret: () => required("PATIENT_SESSION_SECRET"),
  cronSecret: () => required("CRON_SECRET"),
  inboundWebhookSecret: () => required("INBOUND_WEBHOOK_SECRET"),
  /** "manual" (default, free one-tap WhatsApp), "log" (dev: print only), "msg91", "whatsapp". */
  messagingProvider: () => process.env.MESSAGING_PROVIDER ?? "manual",
  /** Fixed OTP for testing. Never active in production builds. */
  demoOtp: () => (process.env.NODE_ENV === "production" ? null : process.env.DEMO_OTP || null),
};
