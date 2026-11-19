import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { proClinicIds } from "@/lib/subscription";
import { PresencePost, STORE_EVERY_SECONDS, bearerToken, cleanSightings, hashToken } from "@/lib/presence";

// Staff tracking (Pro, Beta). The ESP32 presence node posts here every ~20 s:
//   POST /api/presence
//   Authorization: Bearer cen_xxx          (the token shown once when the admin added the node)
//   { "fw": "cen-node-1.0", "sightings": [ { "id": "aa:bb:cc:dd:ee:ff", "rssi": -61 }, ... ] }
// Tags that are not registered to a staff member are dropped right here and never stored, so
// patients' or neighbours' phones are not recorded.

export async function POST(req: NextRequest) {
  const token = bearerToken(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  let post: PresencePost;
  try {
    const raw = await req.text();
    if (raw.length > 16_000) return NextResponse.json({ ok: false }, { status: 413 });
    post = PresencePost.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: node } = await db
    .from("presence_nodes")
    .select("id, clinic_id, active")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!node || !node.active) return NextResponse.json({ ok: false }, { status: 401 });

  const now = new Date();
  await db
    .from("presence_nodes")
    .update({ last_seen_at: now.toISOString(), firmware: post.fw ?? null })
    .eq("id", node.id);

  // Staff tracking is a Pro service: a Basic clinic's node stays "online" but nothing is stored.
  if (!(await proClinicIds([node.clinic_id], now)).has(node.clinic_id)) {
    return NextResponse.json({ ok: true, stored: 0, pro: false });
  }

  const seen = cleanSightings(post);
  if (seen.size === 0) return NextResponse.json({ ok: true, stored: 0 });

  const { data: devices } = await db
    .from("staff_devices")
    .select("user_id, identifier")
    .eq("clinic_id", node.clinic_id)
    .eq("active", true)
    .in("identifier", [...seen.keys()]);
  if (!devices?.length) return NextResponse.json({ ok: true, stored: 0 });

  // One sighting per person per minute is plenty; skip people stored very recently.
  const users = [...new Set(devices.map((d) => d.user_id as string))];
  const since = new Date(now.getTime() - STORE_EVERY_SECONDS * 1000).toISOString();
  const { data: recent } = await db
    .from("staff_presence_events")
    .select("user_id")
    .eq("clinic_id", node.clinic_id)
    .in("user_id", users)
    .gte("seen_at", since);
  const skip = new Set((recent ?? []).map((r) => r.user_id as string));

  const rows = devices
    .filter((d) => !skip.has(d.user_id as string))
    // a person with two tags in range gives one row
    .filter((d, i, all) => all.findIndex((x) => x.user_id === d.user_id) === i)
    .map((d) => ({
      clinic_id: node.clinic_id,
      user_id: d.user_id,
      node_id: node.id,
      seen_at: now.toISOString(),
      rssi: seen.get(d.identifier as string) ?? null,
    }));
  if (rows.length) {
    const { error } = await db.from("staff_presence_events").insert(rows);
    if (error) {
      console.error("[presence] insert failed", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, stored: rows.length });
}
