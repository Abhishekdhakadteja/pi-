// Clinic Easy contact details, shown on the front page, pricing, login, /contact and inside the app.
//
// Fill the TEAM lines below (or set the NEXT_PUBLIC_* variables on Netlify). A person with no phone
// and no email is hidden, so an empty or half-filled entry never shows a broken card.
// Phone: 10-digit Indian mobile, used for Call and WhatsApp.

export type TeamRole = "sales" | "tech";
type TeamSeed = { role: TeamRole; name: string; phone: string; email: string };

const TEAM: TeamSeed[] = [
  { role: "sales", name: "Abhishek Dhakad", phone: "9340346510", email: "mahakall070@gmail.com" },
  { role: "tech", name: "Aniket Dhakad", phone: "6260207359", email: "aniketdhakad181@gmail.com" },
];

/** The company behind Clinic Easy. */
export const COMPANY = { hi: "तेजा अन्ना ग्रुप · तेजा अन्ना ऑटोमेशन", en: "Teja Anna Group · Teja Anna Automation" } as const;

/** Shown under the contact cards with the Indian flag. No city or address, by the founders' choice. */
export const HUB = { hi: "भारत", en: "भारत" } as const;

/** Old single support line (kept so existing Netlify settings keep working). */
const PHONE = "";
const EMAIL = "";

export type TeamMember = {
  role: TeamRole;
  name: string;
  phone: string;
  email: string;
  tel: string;
  whatsapp: string;
  display: string;
};
export type SupportContact = { phone: string; email: string; tel: string; whatsapp: string; display: string };

export function cleanPhone(raw: string | undefined | null): string {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

function links(phone: string, text: string) {
  return {
    tel: phone ? `tel:+91${phone}` : "",
    whatsapp: phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : "",
    display: phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : "",
  };
}


// NEXT_PUBLIC_* must be read with literal names so Next.js can inline them in the browser bundle.
function envFor(role: TeamRole) {
  return role === "sales"
    ? {
        name: process.env.NEXT_PUBLIC_SALES_NAME,
        phone: process.env.NEXT_PUBLIC_SALES_PHONE,
        email: process.env.NEXT_PUBLIC_SALES_EMAIL,
      }
    : {
        name: process.env.NEXT_PUBLIC_TECH_NAME,
        phone: process.env.NEXT_PUBLIC_TECH_PHONE,
        email: process.env.NEXT_PUBLIC_TECH_EMAIL,
      };
}

/** The two founders (Sales, Technical support). Only people with a phone or an email. */
export function getTeam(seed: TeamSeed[] = TEAM): TeamMember[] {
  return seed
    .map((p) => {
      const env: { name?: string; phone?: string; email?: string } = seed === TEAM ? envFor(p.role) : {};
      const phone = cleanPhone(env.phone || p.phone);
      const email = (env.email || p.email).trim();
      const name = (env.name || p.name).trim();
      const text =
        p.role === "sales" ? "Hello Clinic Easy, I want to know about the plans." : "Hello Clinic Easy, I need technical help.";
      return { role: p.role, name, phone, email, ...links(phone, text) };
    })
    .filter((p) => p.phone || p.email);
}

/** One line for the support box: the old support setting, else technical, else sales. */
export function getSupportContact(): SupportContact | null {
  let phone = cleanPhone(process.env.NEXT_PUBLIC_SUPPORT_PHONE || PHONE);
  let email = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || EMAIL).trim();
  if (!phone && !email) {
    const team = getTeam();
    const p = team.find((t) => t.role === "tech") ?? team[0];
    if (!p) return null;
    phone = p.phone;
    email = p.email;
  }
  return { phone, email, ...links(phone, "Hello Clinic Easy team, I need help.") };
}
