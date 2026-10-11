"use client";

import { useEffect, useState } from "react";
import { HEATMAP_RADIUS_KM } from "@/lib/geo";
import type { LatLon, ScoreResponse } from "@/lib/types";

export type HeatState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; score: ScoreResponse }
  | { phase: "unavailable"; availableFrom: string }
  | { phase: "error" };

type Settled = Exclude<HeatState, { phase: "idle" | "loading" }>;

const IDLE: HeatState = { phase: "idle" };
const LOADING: HeatState = { phase: "loading" };

/**
 * Scores the area around `origin` for the event via POST /api/score. Idle until an
 * event is picked, the user's place is known and the heatmap is on; a newer request
 * replaces an older one.
 */
export function useHeatScore(eventId: string | null, origin: LatLon | undefined, enabled: boolean): HeatState {
  const lat = origin?.lat;
  const lon = origin?.lon;
  const key = eventId && enabled && origin ? `${eventId}|${lat}|${lon}` : null;
  const [result, setResult] = useState<{ key: string; state: Settled } | null>(null);

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, origin: { lat, lon }, radiusKm: HEATMAP_RADIUS_KM }),
      signal: ctrl.signal,
    })
      .then(async (res): Promise<Settled> => {
        const json = await res.json();
        if (res.ok) return { phase: "ready", score: json as ScoreResponse };
        if (res.status === 422 && json.error === "forecast_unavailable") {
          return { phase: "unavailable", availableFrom: String(json.availableFrom) };
        }
        return { phase: "error" };
      })
      .catch((err): Settled | null => (err.name === "AbortError" ? null : { phase: "error" }))
      .then((state) => {
        if (state) setResult({ key, state });
      });
    return () => ctrl.abort();
  }, [key, eventId, lat, lon]);

  if (!key) return IDLE;
  return result?.key === key ? result.state : LOADING;
}
