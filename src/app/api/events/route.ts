import { NextResponse } from "next/server";
import { listEvents } from "@/lib/events/catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/events?from=ISO&lat=&lon=
 * Returns upcoming SkyEvent[]. lat/lon are optional; with them, ISS passes
 * for that location are included.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : new Date();
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const origin = lat && lon ? { lat: Number(lat), lon: Number(lon) } : undefined;
  try {
    const events = await listEvents(from, origin);
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
