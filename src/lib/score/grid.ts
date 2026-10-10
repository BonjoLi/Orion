import type { Cell, LatLon } from "@/lib/types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

/** Grid spacing in degrees. Coarser = fewer weather calls. */
export const GRID_STEP_DEG = 0.25;
/** Hard cap so one request never explodes the Open-Meteo quota. */
export const MAX_CELLS = 120;

/**
 * Lat/lon cells on a regular grid inside `radiusKm` of `origin`.
 * If the grid would exceed MAX_CELLS, the step is widened until it fits.
 */
export function buildGrid(origin: LatLon, radiusKm: number): Cell[] {
  let step = GRID_STEP_DEG;
  for (let attempt = 0; attempt < 8; attempt++) {
    const cells = gridAtStep(origin, radiusKm, step);
    if (cells.length <= MAX_CELLS) return cells;
    step *= 1.5;
  }
  return gridAtStep(origin, radiusKm, step).slice(0, MAX_CELLS);
}

function gridAtStep(origin: LatLon, radiusKm: number, step: number): Cell[] {
  const latSpan = radiusKm / 111; // ~111 km per degree of latitude
  const lonSpan = radiusKm / (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));
  const cells: Cell[] = [];
  const lat0 = Math.round((origin.lat - latSpan) / step) * step;
  const lon0 = Math.round((origin.lon - lonSpan) / step) * step;
  for (let lat = lat0; lat <= origin.lat + latSpan; lat += step) {
    for (let lon = lon0; lon <= origin.lon + lonSpan; lon += step) {
      const point = { lat: round3(lat), lon: round3(lon) };
      const distanceKm = haversineKm(origin, point);
      if (distanceKm <= radiusKm) {
        cells.push({ id: `${point.lat}_${point.lon}`, ...point, distanceKm: Math.round(distanceKm) });
      }
    }
  }
  return cells;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
