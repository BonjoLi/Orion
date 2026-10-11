import type { Bounds, LatLon } from "@/lib/types";

export const MILES_TO_M = 1609.344;
/** How far around the chosen place the map zooms (and, later, the heatmap covers). */
export const RADIUS_MILES = 5;
export const RADIUS_M = RADIUS_MILES * MILES_TO_M;

/**
 * Radius of the event heatmap around the chosen place. Proposal, not sourced: sized
 * for "Maryland to New York" from Princeton. The team still has to ratify it.
 */ // tunable
export const HEATMAP_RADIUS_KM = 200;

const M_PER_DEG_LAT = 111_320;

/** Bounding box of a circle of `meters` around `center` (flat-earth, fine at 5 mi). */
export function radiusBounds(center: LatLon, meters: number): Bounds {
  const dLat = meters / M_PER_DEG_LAT;
  const dLon = meters / (M_PER_DEG_LAT * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
  return {
    north: Math.min(center.lat + dLat, 90),
    south: Math.max(center.lat - dLat, -90),
    east: center.lon + dLon,
    west: center.lon - dLon,
  };
}
