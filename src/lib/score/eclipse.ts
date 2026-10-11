import { EclipseKind, Observer, SearchLocalSolarEclipse } from "astronomy-engine";
import type { LatLon, SkyEvent } from "@/lib/types";

// Where a solar eclipse can be seen, computed per point with astronomy-engine
// (https://www.npmjs.com/package/astronomy-engine) instead of shipping path files.
// Live-tested 2026-10-10 for 2024-04-08: total at Rochester, Buffalo, Syracuse and
// Burlington; partial (0.894) at Princeton.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type LocalEclipse = { kind: EclipseKind; peak: Date; peakAltitude: number };

/** This event's eclipse as seen from `p`, or null if `p` doesn't see it inside the event window. */
function localEclipse(p: LatLon, event: SkyEvent): LocalEclipse | null {
  const start = Date.parse(event.windowStart);
  const end = Date.parse(event.windowEnd);
  const info = SearchLocalSolarEclipse(new Date(start - DAY_MS), new Observer(p.lat, p.lon, 0));
  const peak = info.peak.time.date;
  if (peak.getTime() < start || peak.getTime() > end) return null;
  return { kind: info.kind, peak, peakAltitude: info.peak.altitude };
}

/**
 * 1 where the Sun is fully covered (total) or ringed (annular) with the Sun above the
 * horizon, 0 everywhere else, partial coverage included: outside the band the event
 * can't be seen as the eclipse it is, whatever the weather.
 */
export function eclipsePathFactor(p: LatLon, event: SkyEvent): number {
  const eclipse = localEclipse(p, event);
  if (!eclipse || eclipse.peakAltitude <= 0) return 0;
  return eclipse.kind === EclipseKind.Total || eclipse.kind === EclipseKind.Annular ? 1 : 0;
}

/**
 * The single hour whose clouds matter: nearest to the eclipse peak at `origin`.
 * Space Calendar lists eclipses as all-day entries, so `event.peak` can't be used.
 * Falls back to the middle of the window when `origin` doesn't see the eclipse.
 */
export function eclipseHour(origin: LatLon, event: SkyEvent): Date {
  const middle = (Date.parse(event.windowStart) + Date.parse(event.windowEnd)) / 2;
  const peak = localEclipse(origin, event)?.peak.getTime() ?? middle;
  return new Date(Math.round(peak / HOUR_MS) * HOUR_MS);
}
