import { cached, hourBucket, ONE_HOUR_MS } from "@/lib/cache";
import type { LatLon } from "@/lib/types";

// 7Timer ASTRO product: 3-day, 3-hourly, astronomy-specific seeing and
// transparency. Use only for the top few cells (one call per point).
// Docs: https://www.7timer.info/doc.php  (scales: cloudcover 1-9, seeing 1-8, transparency 1-8)
// Live-tested 2026-10-10.

export type AstroPoint = {
  timepoint: number; // hours from init
  cloudcover: number;
  seeing: number;
  transparency: number;
  lifted_index: number;
  rh2m: number;
  wind10m: { direction: string; speed: number };
  temp2m: number;
  prec_type: string;
};

export type AstroForecast = { init: string; dataseries: AstroPoint[] };

export async function fetchAstro(p: LatLon): Promise<AstroForecast> {
  const key = `7t:${hourBucket(new Date())}:${p.lat},${p.lon}`;
  return cached(key, ONE_HOUR_MS, async () => {
    const url = `https://www.7timer.info/bin/api.pl?lon=${p.lon}&lat=${p.lat}&product=astro&output=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`7Timer ${res.status}`);
    return (await res.json()) as AstroForecast;
  });
}
