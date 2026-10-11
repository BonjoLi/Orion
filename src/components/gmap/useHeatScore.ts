"use client";

import { useEffect, useState } from "react";
import { HEATMAP_RADIUS_KM } from "@/lib/geo";
import type { LatLon, ScoreResponse } from "@/lib/types";

export type HeatState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; score: ScoreResponse }
  | { phase: "unavailable"; availableFrom: string }
  /** The weather service asked us to wait; one automatic retry is scheduled. */
  | { phase: "busy" }
  | { phase: "error" };

type Settled = Exclude<HeatState, { phase: "idle" | "loading" }>;
type Outcome = Settled | { phase: "retry"; afterSec: number };

const IDLE: HeatState = { phase: "idle" };
const LOADING: HeatState = { phase: "loading" };
const DEFAULT_RETRY_SEC = 60;

/**
 * Scores the area around `origin` for the event via POST /api/score. Idle until an
 * event is picked, the user's place is known and the heatmap is on; a newer request
 * replaces an older one. If the weather service is busy (503 weather_busy) it waits
 * as long as the server says and tries once more before giving up.
 */
export function useHeatScore(eventId: string | null, origin: LatLon | undefined, enabled: boolean): HeatState {
  const lat = origin?.lat;
  const lon = origin?.lon;
  const key = eventId && enabled && origin ? `${eventId}|${lat}|${lon}` : null;
  const [result, setResult] = useState<{ key: string; state: Settled } | null>(null);

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = (retried: boolean) => {
      fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, origin: { lat, lon }, radiusKm: HEATMAP_RADIUS_KM }),
        signal: ctrl.signal,
      })
        .then(async (res): Promise<Outcome> => {
          const json = await res.json();
          if (res.ok) return { phase: "ready", score: json as ScoreResponse };
          if (res.status === 422 && json.error === "forecast_unavailable") {
            return { phase: "unavailable", availableFrom: String(json.availableFrom) };
          }
          if (res.status === 503 && json.error === "weather_busy" && !retried) {
            return { phase: "retry", afterSec: Number(json.retryAfterSec) || DEFAULT_RETRY_SEC };
          }
          return { phase: "error" };
        })
        .catch((err): Outcome | null => (err.name === "AbortError" ? null : { phase: "error" }))
        .then((outcome) => {
          if (!outcome) return;
          if (outcome.phase === "retry") {
            setResult({ key, state: { phase: "busy" } });
            timer = setTimeout(() => attempt(true), outcome.afterSec * 1000);
            return;
          }
          setResult({ key, state: outcome });
        });
    };

    attempt(false);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [key, eventId, lat, lon]);

  if (!key) return IDLE;
  return result?.key === key ? result.state : LOADING;
}
