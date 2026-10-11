import type { ScorePoint, ScoreResponse, SkyEvent } from "@/lib/types";

// Each spot's "best hour in the window" is yellow almost everywhere (every spot has
// some clear hour), which says nothing about where to go. So the map compares all
// spots at ONE hour: by default the one where the area as a whole looks best. Replays
// (past events) let the user move it with the hour slider.

/** ISO hour with the highest mean score across the scored area. */
export function bestSharedHour(score: ScoreResponse): string {
  const { hours, points } = score;
  if (points.length === 0) return hours[0];
  let best = hours[0];
  let bestMean = -1;
  for (const hour of hours) {
    const mean = points.reduce((sum, p) => sum + (p.byHour[hour] ?? 0), 0) / points.length;
    if (mean > bestMean) {
      best = hour;
      bestMean = mean;
    }
  }
  return best;
}

/** The points with `score` replaced by that hour's score. */
export function pointsAtHour(points: ScorePoint[], hour: string): ScorePoint[] {
  return points.map((p) => ({ ...p, score: p.byHour[hour] ?? 0 }));
}

/** The hour the map shows: the slider's hour for replays, otherwise the area's best hour. */
export function shownHour(score: ScoreResponse, replayHour?: string): string {
  return replayHour && score.hours.includes(replayHour) ? replayHour : bestSharedHour(score);
}

/** Highest score on the map at `hour` (0 = nothing to see). */
export function bestShownScore(score: ScoreResponse, hour = bestSharedHour(score)): number {
  return score.points.reduce((best, p) => Math.max(best, p.byHour[hour] ?? 0), 0);
}

/**
 * Why the map is blank at `hour`, or null when something is drawn. Tells apart "nothing
 * here can ever see it" (off the path, or bad all day) from "bad weather right now",
 * which matters in a replay where the slider moves through a day with rain in it.
 */
export function blankReason(
  score: ScoreResponse,
  kind: SkyEvent["kind"],
  hour: string,
  pathDrawn = false,
): string | null {
  if (bestShownScore(score, hour) > 0) return null;
  const km = Math.round(score.radiusKm);
  const everScores = score.points.some((p) => p.score > 0); // `score` = best hour in the window
  if (everScores) return "Cloud or rain covers every spot in view at this hour. Try another hour.";
  if (kind !== "solar_eclipse") return `No clear spots within ${km} km at this hour.`;
  return pathDrawn
    ? `No spot within ${km} km sees totality. Pick a place inside the blue path.`
    : `No spot within ${km} km sees totality. Try a place on the path, e.g. Rochester, NY.`;
}

/** "Sep 12, 2026" for a `YYYY-MM-DD` day. */
export function formatDayUtc(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Oct 21, 09:00 UTC" */
export function formatHourUtc(hour: string): string {
  const text = new Date(hour).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${text} UTC`;
}
