// Creates ONE demo clinic, demo staff (attender, doctor, admin) and a few FAKE patients.
// Run: npm run seed        (reads .env.local)
// Safe to run again: existing demo rows are reused.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const PASSWORD = process.env.DEMO_PASSWORD || "Demo@12345";

async function must(p) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

async function main() {
  let clinic = (await must(db.from("clinics").select("*").eq("slug", "demo"))).at(0);
  if (!clinic) {
    clinic = (
      await must(
        db
          .from("clinics")
          .insert({
            name: "Demo Clinic",
            slug: "demo",
            address: "Main Road, Indore",
            phone: "9000000000",
            slots_per_day: 40,
            opening_time: "09:00",
            closing_time: "17:00",
          })
          .select(),
      )
    )[0];
  }
  console.log("Clinic:", clinic.name, clinic.id);

  const staff = [
    { email: "attender@demo.clinic", phone: "9000000001", name: "Demo Attender", role: "attender" },
    { email: "doctor@demo.clinic", phone: "9000000002", name: "Sharma", role: "doctor" },
    { email: "admin@demo.clinic", phone: "9000000003", name: "Demo Admin", role: "admin" },
  ];
  const { users: existing } = await must(db.auth.admin.listUsers({ perPage: 1000 }));
  for (const s of staff) {
    let u = existing.find((x) => x.email === s.email);
    if (!u) {
      u = (await must(db.auth.admin.createUser({ email: s.email, password: PASSWORD, email_confirm: true }))).user;
    }
    await must(
      db.from("users").upsert({ id: u.id, clinic_id: clinic.id, name: s.name, phone: s.phone, email: s.email, role: s.role }),
    );
    console.log(`  ${s.role.padEnd(8)} ${s.email} / ${s.phone}  password: ${PASSWORD}`);
  }

  const patients = [
    { name: "Ramesh Kumar (demo)", phone: "9876500001", age: 52, gender: "male", address: "Ward 4" },
    { name: "Sunita Devi (demo)", phone: "9876500001", age: 47, gender: "female", address: "Ward 4" },
    { name: "Aarav Singh (demo)", phone: "9876500002", age: 8, gender: "male", address: "Station Road" },
  ];
  for (const p of patients) {
    const found = await must(db.from("patients").select("id").eq("clinic_id", clinic.id).eq("name", p.name));
    if (!found.length) {
      await must(
        db.from("patients").insert({ ...p, clinic_id: clinic.id, consent_given: true, consent_date: new Date().toISOString() }),
      );
    }
  }
  console.log("Demo patients ready (fake data only).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
