// Pure helpers for the owner (super-admin) area. No server imports, so tests can use them.

/** OWNER_EMAILS="a@x.com, b@y.com" -> ["a@x.com", "b@y.com"] (lower-case, valid emails only). */
export function parseOwnerEmails(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export function isOwnerEmail(email: string | undefined | null, owners: string[]): boolean {
  return !!email && owners.includes(email.trim().toLowerCase());
}

/** "Dr. Sharma's Clinic, Indore" -> "dr-sharmas-clinic-indore-k3f9" (fits clinics.slug ^[a-z0-9-]{3,40}$). */
export function makeSlug(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  const tail = suffix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "x";
  return base ? `${base}-${tail}` : `clinic-${tail}`;
}

/** Ready-to-send WhatsApp text with the clinic's login details (Hindi + English words). */
export function welcomeMessage(p: {
  appUrl: string;
  clinicName: string;
  doctorName: string;
  doctorPhone: string;
  adminEmail: string;
  attenderPhone?: string | null;
}): string {
  const lines = [
    `नमस्ते Dr. ${p.doctorName} जी,`,
    `${p.clinicName} के लिए ClinicEase तैयार है।`,
    ``,
    `Login: ${p.appUrl}/login`,
    `• Doctor screen: मोबाइल ${p.doctorPhone}`,
    `• Admin (settings, staff, UPI): ${p.adminEmail}`,
  ];
  if (p.attenderPhone) lines.push(`• Attender (reception): मोबाइल ${p.attenderPhone}`);
  lines.push(
    ``,
    `Password हमने अलग से बताया है। Phone के Chrome में link खोलकर "Add to Home screen" दबाएँ, app जैसा icon बन जाएगा।`,
  );
  return lines.join("\n");
}
