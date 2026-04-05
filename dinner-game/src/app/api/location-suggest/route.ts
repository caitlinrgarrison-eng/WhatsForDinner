import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTOCOMPLETE_ENDPOINT = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const NOMINATIM_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const EXCLUDED_NON_CONTINENTAL = new Set(["Alaska", "Hawaii", "Puerto Rico"]);

interface GooglePrediction {
  description?: string;
}

interface GoogleAutocompleteResponse {
  status?: string;
  predictions?: GooglePrediction[];
}

interface NominatimItem {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    state_code?: string;
    country_code?: string;
  };
  display_name?: string;
}

async function fetchNominatimSuggestions(input: string): Promise<string[]> {
  const params = new URLSearchParams({
    q: input,
    countrycodes: "us",
    addressdetails: "1",
    format: "jsonv2",
    limit: "8",
  });

  const response = await fetch(`${NOMINATIM_SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: {
      // Nominatim usage policy asks for a descriptive user agent for server-side usage.
      "User-Agent": "WhatsForDinner/1.0 location-suggest",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return [];

  const data = (await response.json()) as NominatimItem[];
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const item of data) {
    const addr = item.address;
    if (!addr) continue;
    if ((addr.country_code ?? "").toLowerCase() !== "us") continue;
    if (addr.state && EXCLUDED_NON_CONTINENTAL.has(addr.state)) continue;

    const city =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.hamlet ??
      addr.municipality ??
      addr.county;
    if (!city) continue;

    const state =
      (addr.state_code ?? "")
        .replace(/^US-/, "")
        .trim()
        .toUpperCase() || addr.state;
    if (!state) continue;

    const label = `${city}, ${state}`;
    if (seen.has(label)) continue;
    seen.add(label);
    suggestions.push(label);
    if (suggestions.length >= 6) break;
  }

  // Final fallback for odd records that don't map cleanly.
  if (!suggestions.length) {
    for (const item of data) {
      if (!item.display_name) continue;
      const coarse = item.display_name.split(",").slice(0, 2).join(",").trim();
      if (!coarse || seen.has(coarse)) continue;
      seen.add(coarse);
      suggestions.push(coarse);
      if (suggestions.length >= 6) break;
    }
  }

  return suggestions;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim() ?? "";
  if (input.length < 2) {
    return NextResponse.json({ suggestions: [] as string[] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: await fetchNominatimSuggestions(input) });
  }

  const params = new URLSearchParams({
    input,
    key: apiKey,
    types: "(cities)",
  });

  const response = await fetch(`${GOOGLE_AUTOCOMPLETE_ENDPOINT}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ suggestions: await fetchNominatimSuggestions(input) });
  }

  const data = (await response.json()) as GoogleAutocompleteResponse;
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ suggestions: await fetchNominatimSuggestions(input) });
  }

  const suggestions = (data.predictions ?? [])
    .map((p) => p.description?.trim())
    .filter((v): v is string => Boolean(v))
    .slice(0, 6);

  if (suggestions.length) {
    return NextResponse.json({ suggestions });
  }

  return NextResponse.json({ suggestions: await fetchNominatimSuggestions(input) });
}
