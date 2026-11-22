import { NextResponse, type NextRequest } from "next/server";
import { logError } from "@/lib/error-log";

// Browser crash reports from the error screen (src/app/error.tsx). Public, so it is kept small:
// tiny body only, a per-visitor limit here, and a global hourly cap inside logError.
const hits = new Map<string, { n: number; at: number }>();
const PER_MIN = 10;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "?";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.at < 60_000) {
    if (++h.n > PER_MIN) return new NextResponse(null, { status: 429 });
  } else hits.set(ip, { n: 1, at: now });
  if (hits.size > 5000) hits.clear();

  const raw = await req.text();
  if (raw.length > 2000) return new NextResponse(null, { status: 413 });
  let body: { path?: unknown; message?: unknown; digest?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  await logError({ source: "browser", path: str(body.path), message: str(body.message), digest: str(body.digest) });
  return new NextResponse(null, { status: 204 });
}
