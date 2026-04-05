import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

interface NominatimReverseItem {
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

function labelFromAddress(addr: NominatimReverseItem["address"]): string | null {
  if (!addr) return null;
  if ((addr.country_code ?? "").toLowerCase() !== "us") return null;
  const city =
    addr.city ??
    addr.town ??
    addr.village ??
    addr.hamlet ??
    addr.municipality ??
    addr.county;
  if (!city) return null;
  const state =
    (addr.state_code ?? "")
      .replace(/^US-/, "")
      .trim()
      .toUpperCase() || addr.state;
  if (!state) return null;
  return `${city}, ${state}`;
}

export async function GET(request: NextRequest) {
  const latRaw = request.nextUrl.searchParams.get("lat")?.trim() ?? "";
  const lonRaw = request.nextUrl.searchParams.get("lon")?.trim() ?? "";
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ label: null as string | null }, { status: 400 });
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_REVERSE_ENDPOINT}?${params.toString()}`, {
    headers: {
      "User-Agent": "WhatsForDinner/1.0 reverse-geocode",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ label: null as string | null });
  }

  const data = (await response.json()) as NominatimReverseItem;
  const fromAddr = labelFromAddress(data.address);
  if (fromAddr) {
    return NextResponse.json({ label: fromAddr });
  }
  if (data.display_name) {
    const coarse = data.display_name.split(",").slice(0, 2).join(",").trim();
    if (coarse) return NextResponse.json({ label: coarse });
  }

  return NextResponse.json({ label: null as string | null });
}
