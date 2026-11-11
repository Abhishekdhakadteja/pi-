import { test, expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Main flow with FAKE data, in its own test clinic ("e2e-test"):
// book by QR -> attender sees it -> doctor completes it -> live queue moves -> reminder is logged.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OTP = process.env.E2E_OTP ?? process.env.DEMO_OTP ?? "123456";
const PASSWORD = "E2e-Test-Pass-1";
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const run = Date.now().toString().slice(-7);
const patientPhone = `97${run}0`.slice(0, 10);
const patientName = `E2E Patient ${run}`;
let clinicId = "";

async function ensureStaff(email: string, role: string, name: string) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user) user = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })).data.user!;
  else await admin.auth.admin.updateUserById(user.id, { password: PASSWORD });
  await admin.from("users").upsert({ id: user.id, clinic_id: clinicId, name, role, email });
}

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.fill("#id", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

test.beforeAll(async () => {
  // A clinic open all day, so the test works at any hour.
  const { data } = await admin
    .from("clinics")
    .upsert({ name: "E2E Test Clinic", slug: "e2e-test", slots_per_day: 288, opening_time: "00:00", closing_time: "23:59" }, { onConflict: "slug" })
    .select("id")
    .single();
  clinicId = data!.id;
  await ensureStaff("e2e-attender@test.local", "attender", "E2E Attender");
  await ensureStaff("e2e-doctor@test.local", "doctor", "E2E Doctor");
});

test("book by QR -> attender sees it -> doctor completes -> live queue moves -> reminder logged", async ({ browser }) => {
  // 1. Patient books from the QR page.
  const pctx = await browser.newContext();
  await pctx.addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);
  const patient = await pctx.newPage();
  await patient.goto("/book/e2e-test");
  await patient.fill("#pphone", patientPhone);
  await patient.getByRole("button", { name: "Send OTP" }).click();
  await patient.fill("#otp", OTP);
  await patient.getByRole("button", { name: "Verify" }).click();
  await expect(patient.getByText("Who is visiting?")).toBeVisible();
  await patient.getByRole("button", { name: /Add patient/ }).click();
  await patient.fill("#mname", patientName);
  await patient.fill("#mage", "41");
  await patient.locator("form input[type=checkbox]").check();
  await patient.locator("form").getByRole("button", { name: "Add patient" }).click();
  await patient.locator("[data-testid=calendar] button:not(:disabled)").first().click(); // today
  await patient.locator("[data-testid=slots] button").first().click();
  await patient.getByRole("button", { name: "Confirm booking" }).click();
  await expect(patient.getByTestId("confirmation")).toBeVisible();
  const token = Number(await patient.getByTestId("token").innerText());
  expect(token).toBeGreaterThan(0);

  // 2. Live queue page (no names, only numbers).
  await patient.getByRole("link", { name: "See live queue" }).click();
  await expect(patient.getByTestId("your-number")).toHaveText(String(token));
  await expect(patient.getByText(patientName)).toHaveCount(0);

  // 3. Attender sees the QR booking on today's list.
  const att = await login(browser, "e2e-attender@test.local");
  await att.goto("/today");
  const row = att.getByTestId(`row-${token}`);
  await expect(row).toContainText(patientName);
  await expect(row).toContainText("QR");
  // Attender cannot open the doctor page.
  await att.goto("/doctor");
  await expect(att).toHaveURL(/\/desk\?denied=1/);
  await att.goto("/today");

  // 4. Doctor calls, writes notes, sets a 2-day course, completes.
  const doc = await login(browser, "e2e-doctor@test.local");
  // Earlier test runs may have left patients in the queue: complete until ours is in the room.
  for (let i = 0; i < 50; i++) {
    const inRoom = doc.getByTestId("in-room");
    if (!(await inRoom.count())) await doc.getByRole("button", { name: "Call next patient" }).click();
    await expect(inRoom).toBeVisible();
    if ((await inRoom.innerText()).includes(patientName)) break;
    await doc.getByRole("button", { name: /Complete/ }).click();
    await doc.waitForTimeout(800);
  }
  await expect(doc.getByTestId("in-room")).toContainText(patientName);
  await expect(patient.getByTestId("go-in")).toBeVisible({ timeout: 15_000 }); // live, no refresh
  await doc.fill("#notes", "E2E SECRET NOTE");
  await doc.fill("#diagnosis", "E2E SECRET DIAGNOSIS");
  await doc.getByRole("button", { name: "Save notes" }).click();
  await expect(doc.getByText("Saved")).toBeVisible();
  await doc.fill("#days", "2");
  await doc.getByRole("button", { name: "Save course" }).click();
  await expect(doc.getByTestId("course-result")).toBeVisible();
  await doc.getByRole("button", { name: /Complete/ }).click();

  // 5. Live queue moves without refresh.
  await expect(patient.getByText("Your visit is complete.")).toBeVisible({ timeout: 15_000 });
  // Attender list updates live too.
  await expect(att.getByTestId(`row-${token}`)).toContainText("Done", { timeout: 35_000 });

  // 6. Reminder job: course ends tomorrow -> reminder is created and logged.
  const res = await fetch("http://localhost:3000/api/cron/reminders", {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(res.status).toBe(200);
  const { data: pat } = await admin.from("patients").select("id").eq("clinic_id", clinicId).eq("name", patientName).single();
  const { data: rem } = await admin.from("reminders").select("kind, status, message").eq("patient_id", pat!.id);
  expect(rem).toHaveLength(1);
  expect(rem![0].status).toBe("logged");
  expect(rem![0].message).toContain(patientName);
  expect(rem![0].message).toContain("/book/e2e-test?r=");
  expect(rem![0].message).not.toContain("SECRET"); // no diagnosis / notes in messages

  // 7. Audit log recorded views and changes.
  const { count } = await admin.from("audit_log").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId);
  expect(count ?? 0).toBeGreaterThan(5);
});
