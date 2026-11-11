import QRCode from "qrcode";
import { requireRole } from "@/lib/staff";
import { serverEnv } from "@/lib/server-env";
import { getT } from "@/lib/lang-server";
import { PrintButton } from "./PrintButton";

// Printable A4 poster with the clinic's booking QR code.
export default async function PosterPage() {
  const staff = await requireRole(["admin"]);
  const { t } = await getT();
  const url = `${serverEnv.appUrl()}/book/${staff.clinic.slug}`;
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  return (
    <div className="bg-white">
      <style>{`@page { size: A4; margin: 0 } @media print { html, body { width: 210mm; height: 297mm } }`}</style>
      <div className="no-print mx-auto flex max-w-md flex-col gap-3 p-4">
        <PrintButton label={t("printPoster")} />
        <a href="/admin" className="btn-secondary">{t("back")}</a>
      </div>
      <div
        className="mx-auto flex flex-col items-center justify-between bg-white px-[12mm] py-[16mm] text-center text-slate-900"
        style={{ width: "210mm", minHeight: "297mm" }}
        data-testid="poster"
      >
        <div>
          <div className="text-[13mm] font-black leading-tight">{staff.clinic.name}</div>
        </div>
        <div className="w-[130mm] rounded-3xl border-[3mm] border-teal-700 p-[6mm]" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex flex-col gap-[4mm]">
          <div className="text-[11mm] font-bold leading-tight text-teal-800">अपॉइंटमेंट बुक करने के लिए स्कैन करें</div>
          <div className="text-[9mm] font-semibold leading-tight">Scan to book your appointment</div>
          <div className="mt-[4mm] break-all text-[4.5mm] text-slate-500">{url}</div>
        </div>
      </div>
    </div>
  );
}
