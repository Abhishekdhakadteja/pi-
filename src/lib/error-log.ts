import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

// Short, privacy-safe error records for the owner page (/owner).
// Never throws: logging must not be able to break the page that is already failing.

const MAX_MESSAGE = 300;
const MAX_PATH = 200;
const KEEP_DAYS = 30;
const MAX_PER_HOUR = 300; // global cap, so a broken page or a spammer cannot fill the database

/** Removes things that could identify a patient: phone numbers, emails, long ids, query strings. */
export function scrubError(text: string | null | undefined, max = MAX_MESSAGE): string {
  return String(text ?? "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s-]{8,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Path without query string or ids, e.g. /book/sharma-clinic?r=abc -> /book/sharma-clinic */
export function scrubPath(path: string | null | undefined): string {
  return scrubError(String(path ?? "").split(/[?#]/)[0], MAX_PATH);
}

export async function logError(e: { source: "server" | "browser"; path?: string | null; message?: string | null; digest?: string | null }) {
  try {
    const db = supabaseAdmin();
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from("app_errors").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
    if ((count ?? 0) >= MAX_PER_HOUR) return;
    await db.from("app_errors").insert({
      source: e.source,
      path: scrubPath(e.path) || null,
      message: scrubError(e.message) || "(no message)",
      digest: scrubError(e.digest, 40) || null,
    });
    // Now and then, drop rows older than 30 days.
    if (Math.random() < 0.05) {
      await db.from("app_errors").delete().lt("created_at", new Date(Date.now() - KEEP_DAYS * 86400_000).toISOString());
    }
  } catch {
    // ignore: the table may not exist yet, or the database itself may be the thing that is down
  }
}
