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

export const EventKind = z.enum([
  "meteor_shower",
  "iss_pass",
  "solar_eclipse",
  "lunar_eclipse",
  "planet",
  "comet",
  "occultation",
]);
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
  /**
   * Replays only: score with this UTC day's weather ("YYYY-MM-DD") instead of the event's
   * own date, so a past event can be shown with recent weather.
   */
  weatherDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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

/** Map viewport in degrees. */
export const Bounds = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
});
export type Bounds = z.infer<typeof Bounds>;

export const ScoreRequest = z.object({
  eventId: z.string(),
  /** Where the user is. Used for distance and as the fallback region center. */
  origin: LatLon,
  /** Radius mode (legacy /map-legacy page). Ignored when `bounds` is given. */
  radiusKm: z.number().min(10).max(1000).default(150),
  /**
   * Viewport mode (Google map page): score the cells inside these bounds.
   * The server caps the region (see REGION_CAP in score/bounds.ts) and
   * responds 413 if the bounds are wider than the cap.
   */
  bounds: Bounds.optional(),
  /** Optional override of the event window start, ISO date or datetime. */
  date: z.string().optional(),
});
export type ScoreRequest = z.infer<typeof ScoreRequest>;

/** Flat point for the deck.gl heatmap: one per cell. */
export const ScorePoint = z.object({
  id: z.string(),
  lon: z.number(),
  lat: z.number(),
  /** Best score in the event window, 0–100. */
  score: z.number(),
  bestHour: z.string(),
  distanceKm: z.number(),
  /** Score at each hour of the window, keyed by ISO hour. */
  byHour: z.record(z.string(), z.number()),
});
export type ScorePoint = z.infer<typeof ScorePoint>;

export const ScoreResponse = z.object({
  event: SkyEvent,
  origin: LatLon,
  radiusKm: z.number(),
  computedAt: z.string(),
  hours: z.array(z.string()),
  /** All cells, sorted by bestScore desc. */
  cells: z.array(CellScore),
  /** GeoJSON FeatureCollection (legacy MapLibre heatmap). */
  geojson: z.any(),
  /** Flat points for the deck.gl heatmap (same data as `cells`). */
  points: z.array(ScorePoint),
  /** The bounds actually scored (snapped to the grid), when in viewport mode. */
  bounds: Bounds.optional(),
  /** Grid spacing in degrees that was used. */
  stepDeg: z.number().optional(),
  /** Solar eclipses: when totality (or annularity) peaks at `origin`; absent if `origin` isn't on the path. */
  totalityAt: z.string().optional(),
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
