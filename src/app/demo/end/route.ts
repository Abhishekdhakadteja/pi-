import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { DEMO_COOKIE, isDemoEmail } from "@/lib/demo";

/** End of the 5 minutes (or "End demo" button): sign this browser out and show the "what next" screen. */
export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  // Only this browser ("local"): other doctors using the demo at the same time stay signed in.
  if (data.user && isDemoEmail(data.user.email)) await supabase.auth.signOut({ scope: "local" });
  const to = req.nextUrl.clone();
  to.pathname = "/demo";
  to.search = "?ended=1";
  const res = NextResponse.redirect(to);
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
