import { Body, Equator, Horizon, Illumination, Observer } from "astronomy-engine";
import type { LatLon } from "@/lib/types";

// Thin wrappers over astronomy-engine. All angles in degrees.
// Docs: https://www.npmjs.com/package/astronomy-engine

function observer(p: LatLon): Observer {
  return new Observer(p.lat, p.lon, 0);
}

/** Altitude of the Sun above the horizon (negative = below). */
export function sunAltitude(p: LatLon, at: Date): number {
  const obs = observer(p);
  const eq = Equator(Body.Sun, at, obs, true, true);
  return Horizon(at, obs, eq.ra, eq.dec, "normal").altitude;
}

/** Altitude of the Moon above the horizon. */
export function moonAltitude(p: LatLon, at: Date): number {
  const obs = observer(p);
  const eq = Equator(Body.Moon, at, obs, true, true);
  return Horizon(at, obs, eq.ra, eq.dec, "normal").altitude;
}

/** Illuminated fraction of the Moon, 0..1. */
export function moonIllumination(at: Date): number {
  return Illumination(Body.Moon, at).phase_fraction;
}

/**
 * Altitude of a fixed sky position (RA in hours, Dec in degrees), e.g. a
 * meteor shower radiant. Used for "is the radiant up yet".
 */
export function altitudeOf(p: LatLon, at: Date, raHours: number, decDeg: number): number {
  return Horizon(at, observer(p), raHours, decDeg, "normal").altitude;
}

/**
 * Right ascension (sidereal hours) and declination (degrees) of a Solar-System
 * body at `at`, of-date. Uses an observer at the equator/prime meridian, which is
 * geocentric to within arcseconds of parallax, so the exact location doesn't matter.
 */
export function bodyRaDec(body: Body, at: Date): { ra: number; dec: number } {
  const eq = Equator(body, at, new Observer(0, 0, 0), true, true);
  return { ra: eq.ra, dec: eq.dec };
}
