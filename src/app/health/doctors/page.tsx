import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getHealthWords } from "@/lib/health/words";
import { SPECIALTIES, SPECIALTY_BY_ID, isEmergency, isSpecialtyId, matchSpecialties, type SpecialtyId } from "@/lib/health/specialties";
import { cleanCity, mapsSearchHref } from "@/lib/health/links";
import { listedClinics } from "@/lib/health/directory";
import { placesConfigured, searchDoctors, type PlaceDoctor } from "@/lib/health/places";
import { PhoneReveal } from "./PhoneReveal";

export const dynamic = "force-dynamic";

// Public doctor finder. Flow: problem text -> specialty (not a diagnosis) -> doctors in the city.
// 1) Clinic Easy clinics that chose to be listed: online booking.
// 2) Other doctors from Google Places (when the key is set): address, phone on tap, WhatsApp.
// 3) Always: a free Google Maps search link.
export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; sp?: string }> }) {
  const lang = await getLang();
  const w = getHealthWords(lang);
  const sp = await searchParams;
  const q = String(sp.q ?? "").slice(0, 80).trim();
  const city = cleanCity(sp.city);
  const chosen: SpecialtyId[] = isSpecialtyId(sp.sp) ? [sp.sp] : matchSpecialties(q);
  const searched = !!q || isSpecialtyId(sp.sp);
  const emergency = isEmergency(q);
  const target: SpecialtyId = chosen[0] ?? "general";
  const targetSpec = SPECIALTY_BY_ID[target];

  let listed: Awaited<ReturnType<typeof listedClinics>> = [];
  let places: PlaceDoctor[] | null = null;
  let placesFailed = false;
  if (searched) {
    const [l, p] = await Promise.all([
      listedClinics(city, chosen.length ? chosen : ["general"]),
      searchDoctors(targetSpec.query, city, lang).catch(() => {
        placesFailed = true;
        return null;
      }),
    ]);
    listed = l;
    places = p;
  }
  const name = (id: SpecialtyId) => (lang === "hi" ? SPECIALTY_BY_ID[id].hi : SPECIALTY_BY_ID[id].en);
  const mapsHref = mapsSearchHref(targetSpec.query, city);
  const pickList = (
    <>
      <p className="mt-5 text-sm font-semibold text-slate-400">{w.orPick}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SPECIALTIES.map((s) => (
          <Link
            key={s.id}
            href={`/health/doctors?sp=${s.id}&city=${encodeURIComponent(city)}`}
            className={`health-chip ${chosen[0] === s.id && searched ? "health-chip-on" : ""}`}
          >
            {s.emoji} {(lang === "hi" ? s.hi : s.en).split(" (")[0]}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <main>
      <h1 className="text-2xl font-bold text-white">🩺 {w.findTitle}</h1>
      <p className="mt-1 text-slate-300">{w.findSub}</p>

      <form className="health-card mt-4 grid gap-3" action="/health/doctors">
        <div>
          <label htmlFor="q" className="mb-1 block text-sm font-semibold text-slate-300">
            {w.problem}
          </label>
          <input id="q" name="q" className="health-input" defaultValue={q} placeholder={w.problemPh} maxLength={80} data-testid="health-q" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="city" className="mb-1 block text-sm font-semibold text-slate-300">
              {w.city}
            </label>
            <input id="city" name="city" className="health-input" defaultValue={city} maxLength={40} list="mp-cities" />
            <datalist id="mp-cities">
              {["Guna", "Ashoknagar", "Shivpuri", "Bhopal", "Indore", "Gwalior", "Vidisha", "Sagar", "Ujjain", "Jabalpur"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <button className="health-btn self-end" data-testid="health-search">
            {w.search}
          </button>
        </div>
      </form>

      {emergency && (
        <div className="mt-6 rounded-3xl border border-red-400/50 bg-red-500/15 p-4" role="alert" data-testid="health-emergency">
          <p className="text-xl font-bold text-red-200">🚨 {w.emergencyTitle}</p>
          <p className="mt-1 text-red-100">{w.emergencyBody}</p>
          <a href="tel:108" className="mt-3 inline-block rounded-2xl bg-red-500 px-5 py-3 text-lg font-bold text-white">
            📞 {w.call108}
          </a>
        </div>
      )}

      {!searched && pickList}

      {searched && (
        <section className="mt-6" data-testid="health-results">
          <div className="health-card border-cyan-400/30">
            <p className="text-sm font-semibold text-cyan-200">{w.youNeed}</p>
            <div className="mt-2 flex flex-col gap-2">
              {(chosen.length ? chosen : (["general"] as SpecialtyId[])).map((id) => (
                <p key={id} className="text-lg text-white">
                  <span aria-hidden>{SPECIALTY_BY_ID[id].emoji}</span> <b>{name(id)}</b>
                  <span className="block text-sm text-slate-400">{lang === "hi" ? SPECIALTY_BY_ID[id].hiAbout : SPECIALTY_BY_ID[id].enAbout}</span>
                </p>
              ))}
            </div>
            {!chosen.length && <p className="mt-2 text-sm text-amber-200">{w.noMatch}</p>}
            <p className="mt-3 text-xs text-slate-400">ℹ️ {w.notDiagnosis}</p>
          </div>

          <h2 className="mt-6 text-lg font-bold text-white">✅ {w.onClinicEasy}</h2>
          {listed.length ? (
            <ul className="mt-2 grid gap-3">
              {listed.map((c) => (
                <li key={c.slug} className="health-card border-emerald-400/30">
                  <p className="text-lg font-bold text-white">{c.doctorName ?? c.name}</p>
                  {c.doctorName && <p className="text-slate-300">{c.name}</p>}
                  {c.specialty && <p className="text-sm text-cyan-200">{name(c.specialty)}</p>}
                  {c.address && <p className="mt-1 text-sm text-slate-400">📍 {c.address}</p>}
                  <Link href={`/book/${c.slug}`} className="health-btn mt-3 inline-flex items-center">
                    📅 {w.bookOnline}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">{w.noneListed}</p>
          )}

          <h2 className="mt-6 text-lg font-bold text-white">
            {name(target).split(" (")[0]} · {city}
          </h2>
          {places && places.length > 0 && (
            <ul className="mt-2 grid gap-3" data-testid="health-places">
              {places.map((p) => (
                <li key={p.id} className="health-card">
                  <p className="text-lg font-bold text-white">{p.name}</p>
                  {p.open === false && <p className="text-xs text-amber-300">{w.closedNow}</p>}
                  <p className="mt-1 text-sm text-slate-400">📍 {p.address}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PhoneReveal placeId={p.id} doctor={p.name} />
                    <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="health-btn-ghost">
                      🧭 {w.directions}
                    </a>
                  </div>
                </li>
              ))}
              <li className="text-right text-xs text-slate-500">{w.fromGoogle}</li>
            </ul>
          )}
          {placesFailed && <p className="mt-2 text-sm text-amber-200">{w.searchFailed}</p>}
          <div className="health-card mt-3">
            {!placesConfigured() && <p className="text-sm text-slate-300">{w.mapsFallback}</p>}
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="health-btn mt-2 flex w-full items-center justify-center text-center !whitespace-normal" data-testid="health-maps">
              🗺️ {w.openMaps}: {name(target).split(" (")[0]}, {city}
            </a>
          </div>
        </section>
      )}

      {searched && pickList}

      <div className="mt-8 rounded-3xl border border-violet-400/30 bg-violet-500/10 p-4 text-center">
        <p className="text-violet-100">👨‍⚕️ {w.doctorJoin}</p>
        <Link href="/" className="health-btn-ghost mt-3">
          {w.doctorJoinCta} →
        </Link>
      </div>
    </main>
  );
}
