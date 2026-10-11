import { cached, hourBucket, ONE_HOUR_MS } from "@/lib/cache";
import type { LatLon } from "@/lib/types";

// Open-Meteo. Free for non-commercial use, no key.
// Limits: 600/min, 5,000/hr, 10,000/day. Multi-location in one request.
// Forecast docs:  https://open-meteo.com/en/docs
// Past forecasts: https://open-meteo.com/en/docs/historical-forecast-api
// Live-tested 2026-10-10: the forecast host takes start_date/end_date from 93 days
// back to today+15 (later dates are rejected); the historical host serves up to yesterday.

const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";
const HISTORY_BASE = "https://historical-forecast-api.open-meteo.com/v1/forecast";
const HOURLY = ["cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "precipitation", "visibility"] as const;

/** Last forecast day = today + this many days (UTC). */
export const FORECAST_MAX_DAYS_AHEAD = 15;
/** Locations per request, so the URL stays short. */ // tunable
const CHUNK = 100;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export type HourlyWeather = {
  /** ISO UTC, top of hour */
  time: string;
  cloudLow: number; // 0..100
  cloudMid: number;
  cloudHigh: number;
  precipitation: number; // mm
  visibility: number; // m
};

export type LocationForecast = {
  lat: number;
  lon: number;
  hourly: HourlyWeather[];
};

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  hourly: Record<(typeof HOURLY)[number] | "time", (number | string)[]>;
};

/** UTC calendar day, `YYYY-MM-DD`. */
export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Hourly weather for many points over `startDate`..`endDate` (UTC days, inclusive).
 * Days before today come from the historical-forecast host (what the models predicted
 * back then), so past events can be replayed. Results keep the order of `points`.
 * Present/future ranges are cached per hour, past ranges for a day.
 */
export async function fetchWeather(points: LatLon[], startDate: string, endDate: string): Promise<LocationForecast[]> {
  if (points.length === 0) return [];
  const now = new Date();
  const past = endDate < utcDay(now);
  const base = past ? HISTORY_BASE : FORECAST_BASE;
  const ttl = past ? ONE_DAY_MS : ONE_HOUR_MS;

  const chunks: LatLon[][] = [];
  for (let i = 0; i < points.length; i += CHUNK) chunks.push(points.slice(i, i + CHUNK));

  const results = await Promise.all(
    chunks.map((chunk) => {
      const key = `om:${past ? "past" : hourBucket(now)}:${startDate}:${endDate}:${chunk.map((p) => `${p.lat},${p.lon}`).join("|")}`;
      return cached(key, ttl, () => fetchChunk(base, chunk, startDate, endDate));
    }),
  );
  return results.flat();
}

async function fetchChunk(base: string, points: LatLon[], startDate: string, endDate: string): Promise<LocationForecast[]> {
  const url = new URL(base);
  url.searchParams.set("latitude", points.map((p) => p.lat).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon).join(","));
  url.searchParams.set("hourly", HOURLY.join(","));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("timezone", "UTC");

  const res = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as OpenMeteoResponse | OpenMeteoResponse[];
  const list = Array.isArray(json) ? json : [json];
  return list.map(parseLocation);
}

function parseLocation(r: OpenMeteoResponse): LocationForecast {
  const t = r.hourly.time as string[];
  const hourly: HourlyWeather[] = t.map((time, i) => ({
    // Open-Meteo returns "2026-10-10T00:00" (no zone) when timezone=UTC
    time: new Date(time + "Z").toISOString(),
    // Missing cloud data (null) counts as overcast, never as a clear sky.
    cloudLow: num(r.hourly.cloud_cover_low[i], 100),
    cloudMid: num(r.hourly.cloud_cover_mid[i], 100),
    cloudHigh: num(r.hourly.cloud_cover_high[i], 100),
    precipitation: num(r.hourly.precipitation[i], 0),
    visibility: num(r.hourly.visibility[i], 0),
  }));
  return { lat: r.latitude, lon: r.longitude, hourly };
}

function num(v: number | string | null | undefined, fallback: number): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
