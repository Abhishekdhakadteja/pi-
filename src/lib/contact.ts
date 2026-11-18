// Clinic Easy support contact, shown on the front page, the login page and inside the app.
// Fill these two lines (or set NEXT_PUBLIC_SUPPORT_PHONE / NEXT_PUBLIC_SUPPORT_EMAIL on Netlify).
// Phone: 10-digit Indian mobile, used for Call and WhatsApp. If both are empty, the box is hidden.
const PHONE = "";
const EMAIL = "";

export type SupportContact = { phone: string; email: string; tel: string; whatsapp: string; display: string };

export function getSupportContact(): SupportContact | null {
  const phone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || PHONE).replace(/\D/g, "").slice(-10);
  const email = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || EMAIL).trim();
  if (!phone && !email) return null;
  return {
    phone,
    email,
    tel: phone ? `tel:+91${phone}` : "",
    whatsapp: phone ? `https://wa.me/91${phone}?text=${encodeURIComponent("Hello Clinic Easy team, I need help.")}` : "",
    display: phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : "",
  };
}
