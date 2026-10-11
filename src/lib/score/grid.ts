import type { Bounds, Cell, LatLon } from "@/lib/types";

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

/** Grid spacing in degrees (~25 km). Coarser = fewer weather calls. */ // tunable
export const GRID_STEP_DEG = 0.25;
/** Hard cap so one request never explodes the Open-Meteo quota. */ // tunable
export const MAX_CELLS = 400;

export type Grid = {
  cells: Cell[];
  /** Spacing actually used (widened from GRID_STEP_DEG when the area is large). */
  step: number;
  /** Lattice edges: cell (i, j) sits at south + i·step, west + j·step. */
  bounds: Bounds;
};

/**
 * Cells on a regular lat/lon lattice covering the square around `origin` that
 * contains the `radiusKm` circle. The client blends between lattice points and
 * masks the circle, so corner cells are kept. If the grid would exceed
 * MAX_CELLS, the step is widened until it fits.
 */
export function buildGrid(origin: LatLon, radiusKm: number): Grid {
  let step = GRID_STEP_DEG;
  for (let attempt = 0; attempt < 8; attempt++) {
    const grid = gridAtStep(origin, radiusKm, step);
    if (grid.cells.length <= MAX_CELLS) return grid;
    step *= 1.5;
  }
  const grid = gridAtStep(origin, radiusKm, step);
  return { ...grid, cells: grid.cells.slice(0, MAX_CELLS) };
}

function gridAtStep(origin: LatLon, radiusKm: number, step: number): Grid {
  const latSpan = radiusKm / 111; // ~111 km per degree of latitude
  const lonSpan = radiusKm / (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));
  // Integer lattice indexes keep the edges exact (no float drift from repeated `+= step`).
  const iMin = Math.floor((origin.lat - latSpan) / step);
  const iMax = Math.ceil((origin.lat + latSpan) / step);
  const jMin = Math.floor((origin.lon - lonSpan) / step);
  const jMax = Math.ceil((origin.lon + lonSpan) / step);
  const cells: Cell[] = [];
  for (let i = iMin; i <= iMax; i++) {
    for (let j = jMin; j <= jMax; j++) {
      const point = { lat: round3(i * step), lon: round3(j * step) };
      if (Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) continue; // off the map; the client leaves it blank
      cells.push({ id: `${point.lat}_${point.lon}`, ...point, distanceKm: Math.round(haversineKm(origin, point)) });
    }
  }
  const bounds = { south: round3(iMin * step), north: round3(iMax * step), west: round3(jMin * step), east: round3(jMax * step) };
  return { cells, step, bounds };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
