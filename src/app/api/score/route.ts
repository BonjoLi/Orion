import { NextResponse } from "next/server";
import { getEvent } from "@/lib/events/catalog";
import { scoreEvent } from "@/lib/score/score";
import { ScoreRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/score  { eventId, origin:{lat,lon}, radiusKm?, date? }
 * Returns ScoreResponse: cells sorted by bestScore plus a GeoJSON
 * FeatureCollection for the heatmap. Weather is cached per hour.
 */
export async function POST(req: Request) {
  const parsed = ScoreRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { eventId, origin, radiusKm } = parsed.data;

  const event = await getEvent(eventId, origin);
  if (!event) return NextResponse.json({ error: `unknown event ${eventId}` }, { status: 404 });

  try {
    const score = await scoreEvent(event, origin, radiusKm);
    return NextResponse.json(score);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
