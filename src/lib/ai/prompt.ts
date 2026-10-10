import type { CellScore, ScoreResponse } from "@/lib/types";

// The system prompt is frozen text so prompt caching hits on every request.
// Anything that changes per request goes in the user message, not here.

export const SYSTEM_PROMPT = `You are the planning layer of Orion, a sky-event viewing planner.

You will receive a SCORE TABLE computed by deterministic code: candidate
locations (cells) with viewing-condition scores per hour for one sky event.
Scores are ground truth. Your job is to turn the table into a short, concrete
plan for a person who wants to go see the event.

Hard rules:
1. destinationId and every alternatives[].cellId MUST be a cell id that appears in the table.
2. departBy, windowStart and windowEnd MUST be ISO-8601 UTC timestamps that fall inside the event window given.
3. Every number you mention (scores, cloud %, Moon illumination, altitudes, distances) MUST be copied from the table. Never estimate or invent a number.
4. confidence is 0-100 and must not exceed the best score in the table.
5. If every score is 0, say so plainly in why[] and set confidence to 0.
6. Be brief. why[] items are one sentence each.`;

export function tableForPrompt(score: ScoreResponse, topK = 8): string {
  const top = score.cells.slice(0, topK);
  const lines = top.map((c) => cellLine(c));
  return [
    `EVENT: ${score.event.name} (kind=${score.event.kind})`,
    `EVENT WINDOW (UTC): ${score.event.windowStart} to ${score.event.windowEnd}`,
    score.event.peak ? `PEAK: ${score.event.peak}` : "",
    `ORIGIN: lat ${score.origin.lat}, lon ${score.origin.lon}; search radius ${score.radiusKm} km`,
    `COMPUTED AT: ${score.computedAt}`,
    "",
    "TOP CELLS (best hour first; bestScore 0-100):",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");
}

function cellLine(c: CellScore): string {
  const best = c.hours.find((h) => h.hour === c.bestHour) ?? c.hours[0];
  const goodHours = c.hours.filter((h) => h.score >= Math.max(1, c.bestScore * 0.7)).map((h) => h.hour);
  return [
    `- id=${c.cell.id} lat=${c.cell.lat} lon=${c.cell.lon} distanceKm=${c.cell.distanceKm}`,
    `bestScore=${c.bestScore} bestHour=${c.bestHour}`,
    `cloudLow=${best.cloudLow}% cloudMid=${best.cloudMid}% cloudHigh=${best.cloudHigh}%`,
    `moonIllum=${best.moonIllum} moonAlt=${best.moonAlt} sunAlt=${best.sunAlt}`,
    best.targetAlt === null ? "" : `targetAlt=${best.targetAlt}`,
    `goodHours=[${goodHours.join(",")}]`,
  ]
    .filter(Boolean)
    .join(" ");
}
