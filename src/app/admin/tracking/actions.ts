"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { getPlanState } from "@/lib/subscription";
import { maxAllowed } from "@/lib/plans";
import { hashToken, newNodeToken, normalizeIdentifier } from "@/lib/presence";

// Staff tracking (Pro Max, Beta): admin adds ESP32 nodes and links Bluetooth tags to staff.
type Err = "pro" | "db" | "name" | "tag" | "exists" | "generic";
export type TrackRes = { ok: true; token?: string } | { ok: false; error: Err };

async function proAdmin() {
  const admin = await assertRole(["admin"]);
  const plan = await getPlanState(admin.clinic_id);
  return { admin, pro: maxAllowed(plan) };
}

/** Creates an ESP32 node. The token is returned ONCE; only its hash is saved. */
export async function addNode(form: FormData): Promise<TrackRes> {
  const { admin, pro } = await proAdmin();
  if (!pro) return { ok: false, error: "pro" };
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (!name) return { ok: false, error: "name" };
  const token = newNodeToken();
  const { data, error } = await supabaseAdmin()
    .from("presence_nodes")
    .insert({ clinic_id: admin.clinic_id, name, token_hash: hashToken(token) })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "42P01" ? "db" : "generic" };
  await audit(admin, "presence_node_added", "presence_nodes", data.id, { name });
  revalidatePath("/admin/tracking");
  return { ok: true, token };
}

export async function setNodeActive(id: string, active: boolean): Promise<TrackRes> {
  const { admin } = await proAdmin();
  const { error } = await (await supabaseServer()).from("presence_nodes").update({ active }).eq("id", id).eq("clinic_id", admin.clinic_id);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/admin/tracking");
  return { ok: true };
}

/** Links a BLE tag (MAC or iBeacon uuid:major:minor) to a staff member. */
export async function addDevice(form: FormData): Promise<TrackRes> {
  const { admin, pro } = await proAdmin();
  if (!pro) return { ok: false, error: "pro" };
  const userId = String(form.get("user_id") ?? "");
  const identifier = normalizeIdentifier(String(form.get("identifier") ?? ""));
  if (!identifier) return { ok: false, error: "tag" };
  const kind = ["ble_tag", "phone", "watch"].find((k) => k === form.get("kind")) ?? "ble_tag";
  const label = String(form.get("label") ?? "").trim().slice(0, 60) || null;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.from("users").select("id").eq("id", userId).eq("clinic_id", admin.clinic_id).maybeSingle();
  if (!u) return { ok: false, error: "generic" };
  const { error } = await supabase
    .from("staff_devices")
    .insert({ clinic_id: admin.clinic_id, user_id: userId, identifier, kind, label });
  if (error) return { ok: false, error: error.code === "23505" ? "exists" : error.code === "42P01" ? "db" : "generic" };
  await audit(admin, "staff_device_added", "staff_devices", userId, { kind });
  revalidatePath("/admin/tracking");
  return { ok: true };
}

export async function removeDevice(id: string): Promise<TrackRes> {
  const { admin } = await proAdmin();
  const { error } = await (await supabaseServer()).from("staff_devices").delete().eq("id", id).eq("clinic_id", admin.clinic_id);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/admin/tracking");
  return { ok: true };
}
