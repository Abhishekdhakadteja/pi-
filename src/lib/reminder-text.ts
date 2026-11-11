// Builds the reminder message. Pure function (unit tested).
// The message must never contain a disease or medicine name: only the four placeholders are filled.

export function fillTemplate(
  template: string,
  v: { patient: string; doctor: string; clinic: string; link: string },
): string {
  const clean = (s: string) => s.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  return template
    .replaceAll("{patient}", clean(v.patient))
    .replaceAll("{doctor}", clean(v.doctor))
    .replaceAll("{clinic}", clean(v.clinic))
    .replaceAll("{link}", v.link);
}

/** A template is valid if it has the {link} placeholder, no unknown placeholders, and is not too long. */
export function isValidTemplate(t: string): boolean {
  if (!t.includes("{link}") || t.length > 600) return false;
  const tags = t.match(/\{[^}]*\}/g) ?? [];
  return tags.every((x) => ["{patient}", "{doctor}", "{clinic}", "{link}"].includes(x));
}

/** True when an incoming SMS/WhatsApp text means "stop messaging me". */
export function isStopMessage(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const w = text.trim().toUpperCase();
  return /^(STOP|UNSUBSCRIBE|STOPALL|CANCEL|END|QUIT|बंद)\b/.test(w) || w === "बंद";
}
