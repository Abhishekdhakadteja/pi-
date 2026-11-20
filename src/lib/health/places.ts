import "server-only";

// Live doctor search through Google Places API (New). Switches on when GOOGLE_PLACES_API_KEY is
// set in Netlify; until then the page shows a free "open in Google Maps" link instead.
//
// Cost design (prices from Google's March 2025 model, India rates are lower):
// - The list uses only "Pro" fields (name, address, Maps link): Text Search Pro SKU, which has a
//   free monthly allowance; above it roughly $32 per 1,000 searches.
// - The phone number is an "Enterprise" field (smaller free allowance, ~$35 per 1,000), so it is
//   fetched ONLY when a person taps "नंबर देखें" on one doctor, never for the whole list.
// - Google's terms do not allow storing Places content (except the place ID), so nothing is saved
//   to our database and responses are not cached. Results show "Google Maps" attribution.
// Set a daily quota on the key in Google Cloud Console so the bill can never pass the free tier.

export function placesConfigured(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY?.trim();
}

export type PlaceDoctor = {
  id: string;
  name: string;
  address: string;
  mapsUrl: string;
  open: boolean | null;
};

const BASE = "https://places.googleapis.com/v1";

/** Returns up to 10 places, or null when the key is not set. Throws on API failure. */
export async function searchDoctors(query: string, city: string, lang: "hi" | "en"): Promise<PlaceDoctor[] | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return null;
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.businessStatus",
    },
    body: JSON.stringify({
      textQuery: `${query} in ${city}, India`,
      languageCode: lang,
      regionCode: "IN",
      pageSize: 10,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`places_${res.status}`);
  const data = (await res.json()) as {
    places?: {
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      googleMapsUri?: string;
      businessStatus?: string;
    }[];
  };
  return (data.places ?? [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(p.id)}`,
      open: p.businessStatus ? p.businessStatus === "OPERATIONAL" : null,
    }))
    .filter((p) => p.name);
}

const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

/** One place's phone number (Enterprise field). Null when unknown or no key. */
export async function placePhone(placeId: string): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key || !PLACE_ID.test(placeId)) return null;
  const res = await fetch(`${BASE}/places/${placeId}`, {
    cache: "no-store",
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "internationalPhoneNumber,nationalPhoneNumber" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { internationalPhoneNumber?: string; nationalPhoneNumber?: string };
  return d.internationalPhoneNumber ?? d.nationalPhoneNumber ?? null;
}
