import { cached, hourBucket, ONE_HOUR_MS } from "@/lib/cache";
import type { LatLon } from "@/lib/types";

// Open-Meteo forecast API. Free for non-commercial use, no key.
// Limits: 600/min, 5,000/hr, 10,000/day. Multi-location in one request.
// Docs: https://open-meteo.com/en/docs
// Live-tested 2026-10-10 for Princeton: cloud_cover_high=97, low/mid=0.

const BASE = "https://api.open-meteo.com/v1/forecast";
const HOURLY = ["cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "precipitation", "visibility"] as const;

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

/**
 * Fetch hourly forecasts for many points in ONE request. Results come back
 * in the same order as `points`. Cached per hour per point-set.
 */
export async function fetchForecasts(points: LatLon[], forecastDays = 7): Promise<LocationForecast[]> {
  if (points.length === 0) return [];
  const key = `om:${hourBucket(new Date())}:${forecastDays}:${points.map((p) => `${p.lat},${p.lon}`).join("|")}`;
  return cached(key, ONE_HOUR_MS, async () => {
    const url = new URL(BASE);
    url.searchParams.set("latitude", points.map((p) => p.lat).join(","));
    url.searchParams.set("longitude", points.map((p) => p.lon).join(","));
    url.searchParams.set("hourly", HOURLY.join(","));
    url.searchParams.set("forecast_days", String(forecastDays));
    url.searchParams.set("timezone", "UTC");

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as OpenMeteoResponse | OpenMeteoResponse[];
    const list = Array.isArray(json) ? json : [json];
    return list.map(parseLocation);
  });
}

function parseLocation(r: OpenMeteoResponse): LocationForecast {
  const t = r.hourly.time as string[];
  const hourly: HourlyWeather[] = t.map((time, i) => ({
    // Open-Meteo returns "2026-10-10T00:00" (no zone) when timezone=UTC
    time: new Date(time + "Z").toISOString(),
    cloudLow: num(r.hourly.cloud_cover_low[i]),
    cloudMid: num(r.hourly.cloud_cover_mid[i]),
    cloudHigh: num(r.hourly.cloud_cover_high[i]),
    precipitation: num(r.hourly.precipitation[i]),
    visibility: num(r.hourly.visibility[i]),
  }));
  return { lat: r.latitude, lon: r.longitude, hourly };
}

function num(v: number | string | null | undefined): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
