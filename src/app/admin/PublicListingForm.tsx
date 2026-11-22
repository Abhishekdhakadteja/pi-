"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { SPECIALTIES } from "@/lib/health/specialties";
import { updatePublicListing } from "./actions";

type Listing = { public_listing: boolean; city: string | null; specialty: string | null; doctor_name: string | null };

const W = {
  hi: {
    title: "आम लोगों की डॉक्टर लिस्ट में दिखें",
    body: "मरीज़ “डॉक्टर खोजें” में बीमारी लिखेंगे तो आपका क्लिनिक आपके शहर में ऑनलाइन बुकिंग के साथ सबसे ऊपर दिखेगा।",
    show: "मेरा क्लिनिक public लिस्ट में दिखाएं",
    doctor: "डॉक्टर का नाम (जैसे Dr. R. Sharma)",
    city: "शहर",
    specialty: "विशेषज्ञता",
    pick: "चुनें",
    save: "सेव करें",
    saved: "सेव हो गया",
    error: "शहर और विशेषज्ञता भरें",
    preview: "लिस्ट देखें",
  },
  en: {
    title: "Appear in the public doctor list",
    body: "When people search their problem in “Find a doctor”, your clinic shows first in your city with online booking.",
    show: "Show my clinic in the public list",
    doctor: "Doctor name (e.g. Dr. R. Sharma)",
    city: "City",
    specialty: "Specialty",
    pick: "Choose",
    save: "Save",
    saved: "Saved",
    error: "Fill city and specialty",
    preview: "See the list",
  },
};

export function PublicListingForm({ listing }: { listing: Listing }) {
  const { lang } = useT();
  const w = W[lang];
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<"ok" | "err" | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => setMsg((await updatePublicListing(f)).ok ? "ok" : "err"));
      }}
    >
      <h2 className="text-xl font-bold">🌐 {w.title}</h2>
      <p className="text-sm opacity-80">{w.body}</p>
      <label className="flex items-center gap-3 text-lg">
        <input type="checkbox" name="public_listed" defaultChecked={listing.public_listing} className="h-6 w-6" />
        {w.show}
      </label>
      <div>
        <label className="label" htmlFor="pl-doc">{w.doctor}</label>
        <input id="pl-doc" name="doctor_name" className="input" defaultValue={listing.doctor_name ?? ""} maxLength={120} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pl-city">{w.city}</label>
          <input id="pl-city" name="city" className="input" defaultValue={listing.city ?? ""} placeholder="Guna" maxLength={40} />
        </div>
        <div>
          <label className="label" htmlFor="pl-sp">{w.specialty}</label>
          <select id="pl-sp" name="specialty" className="input" defaultValue={listing.specialty ?? ""}>
            <option value="">{w.pick}</option>
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.id}>
                {lang === "hi" ? s.hi : s.en}
              </option>
            ))}
          </select>
        </div>
      </div>
      {msg && <p className={msg === "ok" ? "ok-box" : "error-box"}>{msg === "ok" ? w.saved : w.error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "..." : w.save}</button>
        <a href="/health/doctors" target="_blank" className="btn-secondary">{w.preview}</a>
      </div>
    </form>
  );
}
