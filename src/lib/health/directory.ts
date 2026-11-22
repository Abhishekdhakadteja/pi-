import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isSpecialtyId, type SpecialtyId } from "./specialties";

export type ListedClinic = {
  slug: string;
  name: string;
  doctorName: string | null;
  address: string | null;
  city: string | null;
  specialty: SpecialtyId | null;
};

/**
 * Clinics on Clinic Easy that chose to be listed, in this city (and specialty when given).
 * Returns [] when the directory migration has not been run yet, so the page never breaks.
 */
export async function listedClinics(city: string, specialties: SpecialtyId[]): Promise<ListedClinic[]> {
  try {
    let q = supabaseAdmin()
      .from("clinics")
      .select("slug, name, doctor_name, address, city, specialty")
      .eq("public_listing", true)
      .eq("signup_status", "active")
      .ilike("city", city.replace(/[%_\\]/g, ""))
      .limit(20);
    if (specialties.length) q = q.in("specialty", specialties);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((c) => ({
      slug: c.slug,
      name: c.name,
      doctorName: c.doctor_name ?? null,
      address: c.address ?? null,
      city: c.city ?? null,
      specialty: isSpecialtyId(c.specialty) ? c.specialty : null,
    }));
  } catch {
    return [];
  }
}
