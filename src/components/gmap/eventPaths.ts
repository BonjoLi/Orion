import eclipsePath from "@/data/eclipse-path-2024-04-08.json";
import type { Bounds } from "@/lib/types";

// Outlines drawn on the map for events that are only visible along a path. Only the
// demo eclipse has one; built by scripts/build-eclipse-path.mjs.

export type EventPath = {
  ring: { lat: number; lng: number }[];
  bounds: Bounds;
};

function boundsOfRing(ring: { lat: number; lng: number }[]): Bounds {
  const lats = ring.map((p) => p.lat);
  const lngs = ring.map((p) => p.lng);
  return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) };
}

function fromGeoJson(feature: { geometry: { coordinates: number[][][] } }): EventPath {
  const lonLat = feature.geometry.coordinates[0];
  const ring = lonLat.map(([lng, lat]) => ({ lat, lng }));
  return { ring, bounds: boundsOfRing(ring) };
}

/** Build a drawable path from an event's footprint ring (e.g. an ISS pass). */
export function pathFromRing(ring: { lat: number; lng: number }[]): EventPath | undefined {
  if (ring.length < 3) return undefined;
  return { ring, bounds: boundsOfRing(ring) };
}

const PATHS: Record<string, EventPath> = {
  [eclipsePath.properties.eventId]: fromGeoJson(eclipsePath),
};

/** The path of totality to draw for this event, if it has one. */
export function pathFor(eventId: string | null): EventPath | undefined {
  return eventId ? PATHS[eventId] : undefined;
}
