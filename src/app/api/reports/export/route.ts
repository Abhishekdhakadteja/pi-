import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getStaff } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { buildReport, parsePeriod } from "@/lib/report";

export const dynamic = "force-dynamic";

// Excel export for admin and doctor. Contains ONLY what the clinic needs. Never doctor notes or diagnosis.
export async function GET(req: NextRequest) {
  const staff = await getStaff();
  if (!staff || !["admin", "doctor"].includes(staff.role)) {
    return NextResponse.json({ error: "not allowed" }, { status: 403 });
  }
  const period = parsePeriod(req.nextUrl.searchParams.get("p"));
  const r = await buildReport(staff.clinic_id, period);

  const wb = new ExcelJS.Workbook();
  wb.creator = "ClinicEase";
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Item", key: "k", width: 32 },
    { header: "Value", key: "v", width: 16 },
  ];
  summary.addRows([
    { k: "Clinic", v: staff.clinic.name },
    { k: "From", v: r.from },
    { k: "To", v: r.to },
    { k: "Appointments booked", v: r.booked },
    { k: "Done", v: r.done },
    { k: "Missed", v: r.missed },
    { k: "Walk-in (desk)", v: r.walkIn },
    { k: "QR bookings", v: r.qr },
    { k: "Reminders sent", v: r.remindersSent },
    { k: "Patients who booked after a reminder", v: r.bookedAfterReminder },
  ]);
  summary.getRow(1).font = { bold: true };

  const sheet = wb.addWorksheet("Appointments");
  sheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Token", key: "token", width: 8 },
    { header: "Time", key: "time", width: 8 },
    { header: "Patient name", key: "name", width: 28 },
    { header: "Mobile", key: "phone", width: 14 },
    { header: "Age", key: "age", width: 6 },
    { header: "Gender", key: "gender", width: 9 },
    { header: "Status", key: "status", width: 10 },
    { header: "Booked via", key: "source", width: 11 },
    { header: "After reminder", key: "after", width: 15 },
  ];
  for (const a of r.rows) {
    sheet.addRow({
      date: a.date,
      token: a.token_number,
      time: a.slot_time.slice(0, 5),
      name: a.patient?.name ?? "",
      phone: a.patient?.phone ?? "",
      age: a.patient?.age ?? "",
      gender: a.patient?.gender ?? "",
      status: a.status,
      source: a.source === "qr" ? "QR" : "Desk",
      after: a.afterReminder ? "Yes" : "No",
    });
  }
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  await audit(staff, "export", "appointments", null, { period, from: r.from, to: r.to, rows: r.rows.length });
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="clinicease-${period}-${r.from}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
