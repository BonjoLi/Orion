import { cacheGet, cacheSet, hourBucket, ONE_HOUR_MS } from "@/lib/cache";
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
const FETCH_TIMEOUT_MS = 15_000; // tunable
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
 * Open-Meteo refused with 429, or went too slow to answer. Its own 429 message says
 * "Please try again in one minute", so that is what callers are told.
 * Live-seen 2026-10-10 with two heatmaps back to back.
 */
export class WeatherBusyError extends Error {
  readonly retryAfterSec = 60;
  constructor() {
    super("Open-Meteo minutely request limit exceeded");
  }
}

/** Points being fetched right now, so a second request for the same point waits instead of calling again. */
const inflight = new Map<string, Promise<LocationForecast>>();

/**
 * Hourly weather for many points over `startDate`..`endDate` (UTC days, inclusive).
 * Days before today come from the historical-forecast host (what the models predicted
 * back then), so past events can be replayed. Results keep the order of `points`.
 *
 * Cached per grid point, not per request: grid points sit on a fixed lattice (see grid.ts),
 * so a search next to an earlier one reuses most of its points and only fetches the new ones.
 * Present/future ranges are cached for an hour, past ranges for a day. Points that were
 * fetched successfully stay cached even if another chunk is refused (WeatherBusyError).
 */
export async function fetchWeather(points: LatLon[], startDate: string, endDate: string): Promise<LocationForecast[]> {
  if (points.length === 0) return [];
  const now = new Date();
  const past = endDate < utcDay(now);
  const base = past ? HISTORY_BASE : FORECAST_BASE;
  const ttl = past ? ONE_DAY_MS : ONE_HOUR_MS;
  const stamp = past ? "past" : hourBucket(now);
  const keyOf = (p: LatLon) => `om:${stamp}:${startDate}:${endDate}:${p.lat},${p.lon}`;
  const keys = points.map(keyOf);

  const wanted = new Map<string, LatLon>();
  points.forEach((p, i) => {
    if (cacheGet<LocationForecast>(keys[i]) === undefined && !inflight.has(keys[i])) wanted.set(keys[i], p);
  });
  const toFetch = [...wanted.values()];
  for (let i = 0; i < toFetch.length; i += CHUNK) {
    const chunk = toFetch.slice(i, i + CHUNK);
    const request = fetchChunk(base, chunk, startDate, endDate);
    chunk.forEach((p, j) => {
      const key = keyOf(p);
      const forecast = request.then((list) => {
        if (!list[j]) throw new Error("Open-Meteo returned fewer locations than asked for");
        return cacheSet(key, list[j], ttl);
      });
      inflight.set(key, forecast);
      const done = () => void inflight.delete(key);
      forecast.then(done, done);
    });
  }

  const settled = await Promise.allSettled(
    keys.map((key) => {
      const hit = cacheGet<LocationForecast>(key);
      return hit ? Promise.resolve(hit) : (inflight.get(key) ?? Promise.reject(new Error("weather point went missing")));
    }),
  );
  const failure = settled.find((s): s is PromiseRejectedResult => s.status === "rejected");
  if (failure) {
    const busy = settled.find((s) => s.status === "rejected" && s.reason instanceof WeatherBusyError);
    throw busy && busy.status === "rejected" ? busy.reason : failure.reason;
  }
  return settled.map((s) => (s as PromiseFulfilledResult<LocationForecast>).value);
}

async function fetchChunk(base: string, points: LatLon[], startDate: string, endDate: string): Promise<LocationForecast[]> {
  const url = new URL(base);
  url.searchParams.set("latitude", points.map((p) => p.lat).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon).join(","));
  url.searchParams.set("hourly", HOURLY.join(","));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("timezone", "UTC");

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (err) {
    // Open-Meteo answers slowly (not with an error) once the minutely quota is nearly used up
    // (seen 2026-10-10: 15 s timeouts right after two big requests), so a timeout means "busy".
    if (err instanceof DOMException && err.name === "TimeoutError") throw new WeatherBusyError();
    throw err;
  }
  if (res.status === 429) {
    void res.body?.cancel();
    throw new WeatherBusyError();
  }
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
