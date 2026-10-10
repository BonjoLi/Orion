import { NextResponse } from "next/server";
import { makePlan } from "@/lib/ai/plan";
import { getEvent } from "@/lib/events/catalog";
import { scoreEvent } from "@/lib/score/score";
import { ScoreRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/plan  { eventId, origin:{lat,lon}, radiusKm?, date? }
 * Runs the score, then ONE Claude structured call, validated against the
 * table. Without ANTHROPIC_API_KEY you get the deterministic fallback plan.
 */
export async function POST(req: Request) {
  const parsed = ScoreRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { eventId, origin, radiusKm } = parsed.data;

  const event = await getEvent(eventId, origin);
  if (!event) return NextResponse.json({ error: `unknown event ${eventId}` }, { status: 404 });

  try {
    const score = await scoreEvent(event, origin, radiusKm);
    const result = await makePlan(score);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
