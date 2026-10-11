import type { Feature, FeatureCollection, Point } from "geojson";
import { altitudeOf, moonAltitude, moonIllumination, sunAltitude } from "@/lib/astro/sky";
import { eclipseHour, eclipsePathFactor, eclipsePeakAt } from "@/lib/score/eclipse";
import { buildGrid } from "@/lib/score/grid";
import type { Cell, CellScore, HourScore, LatLon, ScorePoint, ScoreResponse, SkyEvent } from "@/lib/types";
import { FORECAST_MAX_DAYS_AHEAD, fetchWeather, utcDay } from "@/lib/weather/openMeteo";

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The event starts beyond the weather forecast's reach. `availableFrom` is a UTC day. */
export class ForecastUnavailableError extends Error {
  constructor(public readonly availableFrom: string) {
    super(`forecast not available until ${availableFrom}`);
  }
}

// ---------------------------------------------------------------------------
// Deterministic viewing-condition score. This is the ground truth; the AI
// plan is only allowed to quote numbers from here.
//
//   score = 100 · clear · dark · (1 − moonPenalty) · targetUp · darkSky
//
// WEIGHTS are a starting proposal (precedent: the AstroWeather Home Assistant
// integration weights cloud×3 over seeing×2 over transparency×1). Tune by eye.
// ---------------------------------------------------------------------------

export const WEIGHTS = {
  cloudLow: 1.0,
  cloudMid: 0.8,
  cloudHigh: 0.5,
  /** Sun altitude thresholds (deg): astronomical / nautical twilight. */
  astroTwilight: -18,
  nauticalTwilight: -12,
  /** Moon penalty ramps from 0 at moonAlt=-5° to full at +25°. */
  moonAltFloor: -5,
  moonAltRamp: 30,
  /** Target (radiant/ISS) usefulness ramps from 10° to 30° altitude. */
  targetAltFloor: 10,
  targetAltRamp: 20,
} as const;

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Light-pollution hook. Returns 1 until a numeric sky-brightness source is wired. */
export function darkSkyFactor(_cell: Cell): number {
  // TODO(data owner): sample World Atlas 2015 (Falchi et al. 2016, CC BY-NC) or
  // VIIRS radiance and map to 0.3..1. See README "Light pollution".
  return 1;
}

export function scoreHour(
  cell: Cell,
  event: SkyEvent,
  at: Date,
  w: { cloudLow: number; cloudMid: number; cloudHigh: number; precipitation: number },
  /** Solar eclipses only: 1 inside the totality/annularity path, 0 outside (see eclipse.ts). */
  pathFactor = 1,
): HourScore {
  const p: LatLon = { lat: cell.lat, lon: cell.lon };
  const sunAlt = sunAltitude(p, at);
  const moonAlt = moonAltitude(p, at);
  const moonIllum = moonIllumination(at);

  const clear = 1 - clamp01((WEIGHTS.cloudLow * w.cloudLow + WEIGHTS.cloudMid * w.cloudMid + WEIGHTS.cloudHigh * w.cloudHigh) / 100);
  const dark = sunAlt < WEIGHTS.astroTwilight ? 1 : sunAlt < WEIGHTS.nauticalTwilight ? 0.5 : 0;
  const moonPenalty = moonIllum * clamp01((moonAlt - WEIGHTS.moonAltFloor) / WEIGHTS.moonAltRamp);

  let targetAlt: number | null = null;
  let targetUp = event.kind === "solar_eclipse" ? pathFactor : 1;
  if (event.target) {
    targetAlt = altitudeOf(p, at, event.target.ra, event.target.dec);
    targetUp = clamp01((targetAlt - WEIGHTS.targetAltFloor) / WEIGHTS.targetAltRamp);
  }
  // Solar eclipses happen in daylight: darkness is irrelevant, path membership is everything.
  const darkTerm = event.kind === "solar_eclipse" ? 1 : dark;
  const moonTerm = event.kind === "solar_eclipse" ? 1 : 1 - moonPenalty;

  const raw = w.precipitation > 0 ? 0 : 100 * clear * darkTerm * moonTerm * targetUp * darkSkyFactor(cell);

  return {
    hour: at.toISOString(),
    score: Math.round(raw),
    clear: round2(clear),
    dark: darkTerm,
    moonPenalty: round2(moonPenalty),
    targetUp: round2(targetUp),
    cloudLow: w.cloudLow,
    cloudMid: w.cloudMid,
    cloudHigh: w.cloudHigh,
    precipitation: w.precipitation,
    sunAlt: round2(sunAlt),
    moonAlt: round2(moonAlt),
    moonIllum: round2(moonIllum),
    targetAlt: targetAlt === null ? null : round2(targetAlt),
  };
}

/** Replay hours scored, UTC: roughly US daylight, so the slider covers the whole eclipse day. */ // tunable
const REPLAY_FIRST_HOUR = 12;
const REPLAY_LAST_HOUR = 23;

/**
 * Hours (top of hour, UTC) to score, capped so the map stays cheap.
 * - Replay (event has a `weatherDate`): every daylight hour of the event's day, for the slider.
 * - Solar eclipse: the one hour around the eclipse peak (clouds at 3am don't matter).
 * - Window open now: from now, so the heatmap answers "where tonight?".
 * - Window ahead: from the window start.
 */
export function scoringHours(event: SkyEvent, origin: LatLon, now = new Date(), maxHours = 48): Date[] {
  if (event.weatherDate) {
    const day = event.windowStart.slice(0, 10);
    return Array.from({ length: REPLAY_LAST_HOUR - REPLAY_FIRST_HOUR + 1 }, (_, i) => {
      const hh = String(REPLAY_FIRST_HOUR + i).padStart(2, "0");
      return new Date(`${day}T${hh}:00:00.000Z`);
    });
  }
  if (event.kind === "solar_eclipse") return [eclipseHour(origin, event)];
  const windowStart = Date.parse(event.windowStart);
  const windowEnd = Date.parse(event.windowEnd);
  const open = windowStart <= now.getTime() && now.getTime() <= windowEnd;
  const from = Math.floor((open ? now.getTime() : windowStart) / HOUR_MS) * HOUR_MS;
  const hours: Date[] = [];
  for (let t = from; t <= windowEnd && hours.length < maxHours; t += HOUR_MS) hours.push(new Date(t));
  return hours;
}

/** The moment whose weather is used for `at`: same time of day on `event.weatherDate` for replays. */
export function weatherHour(at: Date, event: SkyEvent): Date {
  return event.weatherDate ? new Date(`${event.weatherDate}T${at.toISOString().slice(11)}`) : at;
}

export async function scoreEvent(event: SkyEvent, origin: LatLon, radiusKm: number, now = new Date()): Promise<ScoreResponse> {
  const { cells, step, bounds } = buildGrid(origin, radiusKm);

  const scheduled = scoringHours(event, origin, now);
  if (scheduled.length === 0) throw new Error(`event ${event.id} has no hours to score`);
  const lastDay = utcDay(new Date(now.getTime() + FORECAST_MAX_DAYS_AHEAD * DAY_MS));
  const hours = scheduled.filter((h) => utcDay(weatherHour(h, event)) <= lastDay);
  if (hours.length === 0) {
    const first = weatherHour(scheduled[0], event);
    throw new ForecastUnavailableError(utcDay(new Date(first.getTime() - FORECAST_MAX_DAYS_AHEAD * DAY_MS)));
  }

  const forecasts = await fetchWeather(
    cells,
    utcDay(weatherHour(hours[0], event)),
    utcDay(weatherHour(hours[hours.length - 1], event)),
  );
  const pathFactors = event.kind === "solar_eclipse" ? cells.map((c) => eclipsePathFactor(c, event)) : undefined;

  const cellScores: CellScore[] = cells.map((cell, i) => {
    const byHour = new Map(forecasts[i]?.hourly.map((h) => [h.time, h]) ?? []);
    const hourScores = hours.map((at) => {
      const w = byHour.get(weatherHour(at, event).toISOString()) ?? { cloudLow: 100, cloudMid: 100, cloudHigh: 100, precipitation: 0 };
      return scoreHour(cell, event, at, w, pathFactors?.[i]);
    });
    const best = hourScores.reduce((a, b) => (b.score > a.score ? b : a), hourScores[0]);
    return { cell, bestHour: best.hour, bestScore: best.score, hours: hourScores };
  });
  cellScores.sort((a, b) => b.bestScore - a.bestScore);

  return {
    event,
    origin,
    radiusKm,
    computedAt: new Date().toISOString(),
    hours: hours.map((h) => h.toISOString()),
    cells: cellScores,
    geojson: toGeoJSON(cellScores),
    points: toPoints(cellScores),
    bounds,
    stepDeg: step,
    totalityAt: event.kind === "solar_eclipse" ? eclipsePeakAt(origin, event)?.toISOString() : undefined,
  };
}

/** Flat points for the deck.gl heatmap. */
export function toPoints(cells: CellScore[]): ScorePoint[] {
  return cells.map((c) => ({
    id: c.cell.id,
    lon: c.cell.lon,
    lat: c.cell.lat,
    score: c.bestScore,
    bestHour: c.bestHour,
    distanceKm: c.cell.distanceKm,
    byHour: Object.fromEntries(c.hours.map((h) => [h.hour, h.score])),
  }));
}

export function toGeoJSON(cells: CellScore[]): FeatureCollection<Point> {
  const features: Feature<Point>[] = cells.map((c) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [c.cell.lon, c.cell.lat] },
    properties: {
      id: c.cell.id,
      score: c.bestScore,
      bestHour: c.bestHour,
      distanceKm: c.cell.distanceKm,
      // per-hour scores so the slider can switch without a refetch
      byHour: Object.fromEntries(c.hours.map((h) => [h.hour, h.score])),
    },
  }));
  return { type: "FeatureCollection", features };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
