import { NextRequest, NextResponse } from "next/server";

/** Proxies Google Place Photos so the API key stays server-side. */
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("photo_reference");
  const maxwidth = request.nextUrl.searchParams.get("maxwidth") ?? "800";
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!ref?.trim() || !key) {
    return NextResponse.json({ error: "Missing photo reference or server configuration." }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxwidth)}&photo_reference=${encodeURIComponent(ref.trim())}&key=${key}`;
  const res = await fetch(url, { redirect: "follow", cache: "force-cache" });
  if (!res.ok) {
    return NextResponse.json({ error: "Photo request failed." }, { status: 502 });
  }

  const buf = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
