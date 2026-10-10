import type { Bounds, Cell, LatLon } from "@/lib/types";
import { haversineKm } from "@/lib/score/grid";

// ---------------------------------------------------------------------------
// Viewport-mode grid. The heatmap is regional by design (team decision):
// never world-wide, at most roughly "the East Coast". Cells are snapped to a
// fixed lattice so panning re-uses cached cells instead of re-fetching.
// Constants are proposals (// tunable); none are sourced from literature.
// ---------------------------------------------------------------------------

/** Max region we will score, in degrees. ~25° lon × 20° lat ≈ US East Coast. */ // tunable
export const REGION_CAP = { lonSpan: 25, latSpan: 20 } as const;

/** Max cells per request; one Open-Meteo multi-location call covers them all. */ // tunable
export const MAX_VIEWPORT_CELLS = 200;

/** Allowed lattice spacings, degrees. Finer when zoomed in, coarser when out. */ // tunable
const STEPS_DEG = [0.1, 0.15, 0.25, 0.4, 0.6, 1.0, 1.5] as const;

export class RegionTooLargeError extends Error {
  constructor(public readonly bounds: Bounds) {
    super(`bounds exceed region cap (${REGION_CAP.lonSpan}° lon × ${REGION_CAP.latSpan}° lat)`);
  }
}

export function lonSpan(b: Bounds): number {
  const span = b.east - b.west;
  return span < 0 ? span + 360 : span; // antimeridian-crossing viewport
}

export function latSpan(b: Bounds): number {
  return b.north - b.south;
}

/** Throws RegionTooLargeError if the viewport exceeds the cap. */
export function assertWithinCap(b: Bounds): void {
  if (lonSpan(b) > REGION_CAP.lonSpan || latSpan(b) > REGION_CAP.latSpan) throw new RegionTooLargeError(b);
}

/** Smallest lattice step that keeps the cell count ≤ MAX_VIEWPORT_CELLS. */
export function chooseStep(b: Bounds, maxCells = MAX_VIEWPORT_CELLS): number {
  for (const step of STEPS_DEG) {
    const n = (Math.floor(lonSpan(b) / step) + 2) * (Math.floor(latSpan(b) / step) + 2);
    if (n <= maxCells) return step;
  }
  return STEPS_DEG[STEPS_DEG.length - 1];
}

/** Snap bounds outward to the lattice so neighbouring viewports share cells. */
export function snapBounds(b: Bounds, step: number): Bounds {
  const down = (v: number) => Math.floor(v / step) * step;
  const up = (v: number) => Math.ceil(v / step) * step;
  return {
    west: round4(down(b.west)),
    east: round4(up(b.east)),
    south: round4(Math.max(-90, down(b.south))),
    north: round4(Math.min(90, up(b.north))),
  };
}

/**
 * Lattice cells covering `bounds`. Cell ids are `${lat}_${lon}` on the
 * lattice, identical across requests, which is what makes the cache work.
 */
export function buildGridForBounds(bounds: Bounds, origin: LatLon, maxCells = MAX_VIEWPORT_CELLS): { cells: Cell[]; step: number; snapped: Bounds } {
  assertWithinCap(bounds);
  const step = chooseStep(bounds, maxCells);
  const snapped = snapBounds(bounds, step);
  const cells: Cell[] = [];
  const crosses = snapped.east < snapped.west;
  const eastEdge = crosses ? snapped.east + 360 : snapped.east;
  for (let lat = snapped.south; lat <= snapped.north + 1e-9; lat = round4(lat + step)) {
    for (let lonRaw = snapped.west; lonRaw <= eastEdge + 1e-9; lonRaw = round4(lonRaw + step)) {
      const lon = lonRaw > 180 ? round4(lonRaw - 360) : lonRaw;
      const point = { lat, lon };
      cells.push({ id: `${lat}_${lon}`, ...point, distanceKm: Math.round(haversineKm(origin, point)) });
      if (cells.length >= maxCells) return { cells, step, snapped };
    }
  }
  return { cells, step, snapped };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
