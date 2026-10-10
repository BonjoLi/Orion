import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared types. Everything crossing an API boundary is defined here once, as
// a zod schema, and the TS type is inferred from it.
// ---------------------------------------------------------------------------

export const LatLon = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type LatLon = z.infer<typeof LatLon>;

export const EventKind = z.enum(["meteor_shower", "iss_pass", "solar_eclipse", "lunar_eclipse"]);
export type EventKind = z.infer<typeof EventKind>;

/** A sky event the user can pick. Times are ISO-8601 UTC. */
export const SkyEvent = z.object({
  id: z.string(),
  kind: EventKind,
  name: z.string(),
  /** Start/end of the window in which the event is worth watching. */
  windowStart: z.string(),
  windowEnd: z.string(),
  /** Peak instant, if there is one. */
  peak: z.string().optional(),
  /** Radiant (meteor) or target (ISS/eclipse) in degrees, if positional. */
  target: z.object({ ra: z.number(), dec: z.number() }).optional(),
  /** Zenithal hourly rate for showers. */
  zhr: z.number().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
});
export type SkyEvent = z.infer<typeof SkyEvent>;

/** One grid cell on the map. */
export const Cell = z.object({
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  /** Great-circle distance from the user's origin, km. */
  distanceKm: z.number(),
});
export type Cell = z.infer<typeof Cell>;

/** Score inputs and output for one cell at one hour. */
export const HourScore = z.object({
  hour: z.string(), // ISO UTC, top of hour
  score: z.number().min(0).max(100),
  clear: z.number(),
  dark: z.number(),
  moonPenalty: z.number(),
  targetUp: z.number(),
  cloudLow: z.number(),
  cloudMid: z.number(),
  cloudHigh: z.number(),
  precipitation: z.number(),
  sunAlt: z.number(),
  moonAlt: z.number(),
  moonIllum: z.number(),
  targetAlt: z.number().nullable(),
});
export type HourScore = z.infer<typeof HourScore>;

export const CellScore = z.object({
  cell: Cell,
  bestHour: z.string(),
  bestScore: z.number(),
  hours: z.array(HourScore),
});
export type CellScore = z.infer<typeof CellScore>;

export const ScoreRequest = z.object({
  eventId: z.string(),
  origin: LatLon,
  radiusKm: z.number().min(10).max(1000).default(150),
  /** Optional override of the event window start, ISO date or datetime. */
  date: z.string().optional(),
});
export type ScoreRequest = z.infer<typeof ScoreRequest>;

export const ScoreResponse = z.object({
  event: SkyEvent,
  origin: LatLon,
  radiusKm: z.number(),
  computedAt: z.string(),
  hours: z.array(z.string()),
  /** All cells, sorted by bestScore desc. */
  cells: z.array(CellScore),
  /** GeoJSON FeatureCollection for the heatmap layer. */
  geojson: z.any(),
});
export type ScoreResponse = z.infer<typeof ScoreResponse>;

/** The AI-written plan. Every id/number must exist in the score table. */
export const Plan = z.object({
  destinationId: z.string(),
  destinationLabel: z.string(),
  departBy: z.string(),
  windowStart: z.string(),
  windowEnd: z.string(),
  why: z.array(z.string()).min(1).max(5),
  alternatives: z.array(z.object({ cellId: z.string(), reason: z.string() })).max(3),
  confidence: z.number().min(0).max(100),
});
export type Plan = z.infer<typeof Plan>;

export const PlanResponse = z.object({
  plan: Plan,
  validation: z.object({
    ok: z.boolean(),
    attempts: z.number(),
    violations: z.array(z.string()),
    fallback: z.boolean(),
  }),
  score: ScoreResponse,
});
export type PlanResponse = z.infer<typeof PlanResponse>;
