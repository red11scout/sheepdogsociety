/**
 * Mapbox geocoding wrapper. Free up to 100k requests/month per token.
 *
 * Uses the public client token (NEXT_PUBLIC_MAPBOX_TOKEN) — Mapbox's
 * forward-geocoding endpoint accepts client tokens, and this is called
 * from a server route so the token isn't actually exposed any more than
 * it already is on the public map page.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeName: string;
  // confidence band — Mapbox returns 0..1 in `relevance`
  relevance: number;
}

const ENDPOINT =
  "https://api.mapbox.com/geocoding/v5/mapbox.places";

export async function geocodeAddress(
  parts: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    countryCode?: string;
  }
): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN is not set");
  }

  const query = [parts.address, parts.city, parts.state, parts.zipCode]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;

  const url = new URL(`${ENDPOINT}/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  url.searchParams.set("country", (parts.countryCode ?? "us").toLowerCase());
  url.searchParams.set("types", "address,poi,postcode,place");
  url.searchParams.set("autocomplete", "false");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    // Mapbox responses are public; cache aggressively at the edge so
    // repeated lookups don't burn quota.
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  if (!res.ok) {
    throw new Error(`Mapbox returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    features?: Array<{
      center?: [number, number];
      place_name?: string;
      relevance?: number;
      properties?: { address?: string };
    }>;
  };
  const top = data.features?.[0];
  if (!top || !top.center) return null;
  const [lng, lat] = top.center;
  return {
    latitude: lat,
    longitude: lng,
    formattedAddress: top.properties?.address ?? "",
    placeName: top.place_name ?? "",
    relevance: top.relevance ?? 0,
  };
}
