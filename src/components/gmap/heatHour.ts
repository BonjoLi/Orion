import type { ScorePoint, ScoreResponse, SkyEvent } from "@/lib/types";

// Each spot's "best hour in the window" is yellow almost everywhere (every spot has
// some clear hour), which says nothing about where to go. So the map compares all
// spots at ONE hour: the one where the area as a whole looks best. The hour slider
// (later) will let the user move this.

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

/** Highest score on the map at the shown hour (0 = nothing to see). */
export function bestShownScore(score: ScoreResponse): number {
  return Math.max(0, ...pointsAtHour(score.points, bestSharedHour(score)).map((p) => p.score));
}

/** Why the map is blank, for the legend and the panel. */
export function emptyHeatMessage(kind: SkyEvent["kind"], radiusKm: number, pathDrawn = false): string {
  const km = Math.round(radiusKm);
  if (kind !== "solar_eclipse") return `No clear spots within ${km} km at this hour.`;
  return pathDrawn
    ? `No spot within ${km} km sees totality. Pick a place inside the blue path.`
    : `No spot within ${km} km sees totality. Try a place on the path, e.g. Rochester, NY.`;
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
