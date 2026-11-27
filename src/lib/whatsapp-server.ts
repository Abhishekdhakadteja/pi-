import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/server-env";
import { cleanPhone } from "@/lib/contact";
import { waLink, welcomeText } from "@/lib/whatsapp";

// Welcome message to a doctor after they pay.
// Free mode (now): returns a one-tap wa.me link the owner presses on /owner.
// Automatic mode: when the Meta WhatsApp Cloud API keys and an approved "welcome" template
// are set in Netlify, the message goes out by itself the moment the payment is confirmed.

export function welcomeApiReady(): boolean {
  return !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID && !!process.env.WHATSAPP_WELCOME_TEMPLATE;
}

export type WelcomeResult = { status: "sent" | "manual" | "failed"; phone: string | null; whatsapp: string; text: string; error?: string };

export async function proWelcome(clinicId: string, plan: string, until?: string, fetcher: typeof fetch = fetch): Promise<WelcomeResult> {
  const db = supabaseAdmin();
  const [{ data: clinic }, { data: staff }] = await Promise.all([
    db.from("clinics").select("name, doctor_name").eq("id", clinicId).maybeSingle(),
    db.from("users").select("name, role, phone").eq("clinic_id", clinicId).eq("active", true),
  ]);
  const doc = staff?.find((s) => s.role === "doctor") ?? staff?.find((s) => s.role === "admin");
  const phone = cleanPhone(doc?.phone) || null;
  const doctorName = (clinic?.doctor_name as string) || doc?.name || "";
  const appUrl = serverEnv.appUrl();
  const text = welcomeText({ appUrl, doctorName, clinicName: clinic?.name ?? "", plan, until });
  const manual: WelcomeResult = { status: "manual", phone, text, whatsapp: phone ? waLink(text, phone) : waLink(text, "") };
  if (!phone || !welcomeApiReady()) return manual;

  // Template (approved in Meta Business Manager) with 3 body variables: {{1}} doctor, {{2}} plan, {{3}} app link.
  try {
    const res = await fetcher(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${phone}`,
        type: "template",
        template: {
          name: process.env.WHATSAPP_WELCOME_TEMPLATE,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "hi" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: doctorName || "Doctor" },
                { type: "text", text: plan === "pro_max" ? "Pro Max" : plan === "pro" ? "AI Pro" : "Basic" },
                { type: "text", text: `${appUrl}/login` },
              ],
            },
          ],
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok || !data.messages?.[0]) return { ...manual, status: "failed", error: data.error?.message ?? String(res.status) };
    await db.from("audit_log").insert({ clinic_id: clinicId, action: "welcome_whatsapp_sent", record_table: "clinics", record_id: clinicId, details: { plan } });
    return { ...manual, status: "sent" };
  } catch (e) {
    return { ...manual, status: "failed", error: e instanceof Error ? e.message : "network" };
  }
}
