import * as satellite from "satellite.js";
import { cached, ONE_HOUR_MS } from "@/lib/cache";
import { sunAltitude } from "@/lib/astro/sky";
import type { LatLon, SkyEvent } from "@/lib/types";

// ISS passes computed client/server-side from CelesTrak orbital elements
// (GP JSON) with SGP4 via satellite.js. No pass-prediction API needed.
// CelesTrak: https://celestrak.org/NORAD/documentation/gp-data-formats.php
// satellite.js was validated against CelesTrak's SGP4 to the meter level:
// https://celestrak.org/software/tutorials/sgp4.php

const ISS_CATNR = 25544;
const GP_URL = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${ISS_CATNR}&FORMAT=JSON`;

type GpRecord = Record<string, unknown>;

async function fetchIssSatrec(): Promise<satellite.SatRec> {
  const gp = await cached(`gp:${ISS_CATNR}`, 6 * ONE_HOUR_MS, async () => {
    const res = await fetch(GP_URL);
    if (!res.ok) throw new Error(`CelesTrak ${res.status}`);
    const arr = (await res.json()) as GpRecord[];
    return arr[0];
  });
  return satellite.json2satrec(gp as never);
}

export type Pass = { start: Date; end: Date; maxElevationDeg: number; maxAt: Date };

/**
 * Visible ISS passes over `origin` in the next `days`, where "visible" means
 * ISS above `minElevationDeg` while the observer is in darkness.
 * TODO(data owner): also require the ISS itself to be sunlit (not in Earth's
 * shadow) for a true "visible" pass. satellite.js exposes the ECI position;
 * compare with the Sun vector from astronomy-engine.
 */
export async function issPasses(origin: LatLon, from: Date, days = 3, minElevationDeg = 10): Promise<Pass[]> {
  const satrec = await fetchIssSatrec();
  const observerGd = {
    longitude: satellite.degreesToRadians(origin.lon),
    latitude: satellite.degreesToRadians(origin.lat),
    height: 0,
  };
  const stepMs = 30 * 1000;
  const endMs = from.getTime() + days * 24 * 60 * 60 * 1000;
  const passes: Pass[] = [];
  let current: Pass | null = null;

  for (let t = from.getTime(); t < endMs; t += stepMs) {
    const date = new Date(t);
    const pv = satellite.propagate(satrec, date);
    if (!pv || typeof pv.position === "boolean") continue;
    const gmst = satellite.gstime(date);
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, ecf);
    const elevation = satellite.radiansToDegrees(look.elevation);
    const dark = sunAltitude(origin, date) < -6;

    if (elevation >= minElevationDeg && dark) {
      if (!current) current = { start: date, end: date, maxElevationDeg: elevation, maxAt: date };
      current.end = date;
      if (elevation > current.maxElevationDeg) {
        current.maxElevationDeg = elevation;
        current.maxAt = date;
      }
    } else if (current) {
      passes.push(current);
      current = null;
    }
  }
  if (current) passes.push(current);
  return passes;
}

export async function issPassEvents(origin: LatLon, from: Date): Promise<SkyEvent[]> {
  try {
    const passes = await issPasses(origin, from);
    return passes.map((p) => ({
      id: `iss-${p.start.toISOString().slice(0, 16).replace(/[:T]/g, "")}`,
      kind: "iss_pass",
      name: `ISS pass (max ${Math.round(p.maxElevationDeg)}°)`,
      windowStart: p.start.toISOString(),
      windowEnd: p.end.toISOString(),
      peak: p.maxAt.toISOString(),
      description: "International Space Station visible pass over your location.",
      source: "https://celestrak.org/",
    }));
  } catch {
    return [];
  }
}
