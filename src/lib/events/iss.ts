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

export type Pass = {
  start: Date;
  end: Date;
  maxElevationDeg: number;
  maxAt: Date;
  /** Where the pass is visible above `minElevationDeg`, as a closed lat/lng ring. */
  footprint: { lat: number; lng: number }[];
};

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
  let current: { start: Date; end: Date; maxElevationDeg: number; maxAt: Date; track: { lat: number; lng: number }[] } | null = null;
  let pending: { lat: number; lng: number }[] | null = null;

  // Sample on an epoch-aligned 30 s grid (not from.getTime()) so a pass gets the same
  // sampled start time — and therefore the same id — no matter how the caller's `from`
  // shifts between the events list and the score call.
  for (let t = Math.floor(from.getTime() / stepMs) * stepMs; t < endMs; t += stepMs) {
    const date = new Date(t);
    const pv = satellite.propagate(satrec, date);
    if (!pv || typeof pv.position === "boolean") continue;
    const gmst = satellite.gstime(date);
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, ecf);
    const elevation = satellite.radiansToDegrees(look.elevation);
    const aboveMin = elevation >= minElevationDeg;
    const dark = sunAltitude(origin, date) < -6;

    if (aboveMin && dark) {
      // Visible: start the pass, folding in any twilight shoulder that preceded it so
      // the footprint still covers the whole geometric pass, not just the dark part.
      if (!current) current = { start: date, end: date, maxElevationDeg: elevation, maxAt: date, track: pending ?? [] };
      pending = null;
      current.end = date;
      current.track.push(subSatellitePoint(ecf));
      if (elevation > current.maxElevationDeg) {
        current.maxElevationDeg = elevation;
        current.maxAt = date;
      }
    } else if (aboveMin) {
      // Above the horizon but the sky isn't dark yet/anymore: part of the footprint,
      // but not of the pass's "visible" window.
      if (current) current.track.push(subSatellitePoint(ecf));
      else (pending ??= []).push(subSatellitePoint(ecf));
    } else {
      if (current) passes.push(finalizePass(current, minElevationDeg));
      current = null;
      pending = null;
    }
  }
  if (current) passes.push(finalizePass(current, minElevationDeg));
  return passes;
}

type TrackPoint = { lat: number; lng: number };

/** The point on Earth directly under the satellite, from its Earth-fixed (km) position. */
function subSatellitePoint(ecf: { x: number; y: number; z: number }): TrackPoint {
  const lat = (Math.atan2(ecf.z, Math.hypot(ecf.x, ecf.y)) * 180) / Math.PI;
  const lng = (Math.atan2(ecf.y, ecf.x) * 180) / Math.PI;
  return { lat, lng };
}

/** Attach the visibility footprint (the ring where the ISS is above `minElevationDeg`). */
function finalizePass(
  p: { start: Date; end: Date; maxElevationDeg: number; maxAt: Date; track: TrackPoint[] },
  minElevationDeg: number,
): Pass {
  return {
    start: p.start,
    end: p.end,
    maxElevationDeg: p.maxElevationDeg,
    maxAt: p.maxAt,
    footprint: footprintRing(p.track, minElevationDeg),
  };
}

const EARTH_RADIUS_KM = 6371;
/** ISS orbit altitude; the footprint width barely changes with the real (400–420 km) value. */
const ISS_ALT_KM = 420;

/**
 * Closed ring bounding the places that see the ISS at least `minElevationDeg` above the
 * horizon at some point during the pass: the ground track offset left/right by the
 * visibility cone's ground radius. End caps are flat — the swath is far wider than the
 * track is long, so the difference is cosmetic. Does not handle antimeridian crossings.
 */
function footprintRing(track: TrackPoint[], minElevationDeg: number): TrackPoint[] {
  if (track.length < 2) return track;
  const eps = (minElevationDeg * Math.PI) / 180;
  const gamma = Math.acos((EARTH_RADIUS_KM / (EARTH_RADIUS_KM + ISS_ALT_KM)) * Math.cos(eps)) - eps;
  const left: TrackPoint[] = [];
  const right: TrackPoint[] = [];
  for (let i = 0; i < track.length; i++) {
    const a = track[Math.max(0, i - 1)];
    const b = track[Math.min(track.length - 1, i + 1)];
    const heading = bearingDeg(a, b);
    left.push(offset(track[i], heading + 90, gamma));
    right.push(offset(track[i], heading - 90, gamma));
  }
  return [...left, ...right.reverse()];
}

/** Initial bearing from `a` to `b`, degrees. */
function bearingDeg(a: TrackPoint, b: TrackPoint): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Move `p` by `angularDistRad` radians along `bearingDeg`. */
function offset(p: TrackPoint, bearingDeg: number, angularDistRad: number): TrackPoint {
  const lat1 = (p.lat * Math.PI) / 180;
  const lon1 = (p.lng * Math.PI) / 180;
  const θ = (bearingDeg * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistRad) + Math.cos(lat1) * Math.sin(angularDistRad) * Math.cos(θ));
  const lon2 = lon1 + Math.atan2(Math.sin(θ) * Math.sin(angularDistRad) * Math.cos(lat1), Math.cos(angularDistRad) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI };
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
      footprint: { ring: p.footprint },
      description: "International Space Station visible pass over your location.",
      source: "https://celestrak.org/",
    }));
  } catch {
    return [];
  }
}
