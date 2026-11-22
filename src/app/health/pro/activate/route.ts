import { NextResponse, type NextRequest } from "next/server";
import { activate } from "@/lib/health/patient-pro";

// The link the owner sends on WhatsApp after payment: /health/pro/activate?code=...
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").slice(0, 600);
  const ok = await activate(code);
  const to = req.nextUrl.clone();
  to.pathname = ok ? "/health/my" : "/health/pro";
  to.search = ok ? "?welcome=1" : "?bad=1";
  return NextResponse.redirect(to);
}
