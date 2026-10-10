"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EventPicker } from "@/components/map/EventPicker";
import { HeatMap } from "@/components/map/HeatMap";
import { TimeSlider } from "@/components/map/TimeSlider";
import { PlanCard } from "@/components/plan/PlanCard";
import type { LatLon, PlanResponse, ScoreResponse, SkyEvent } from "@/lib/types";

// Default origin: Princeton High School. Replaced by geolocation when granted.
const DEFAULT_ORIGIN: LatLon = { lat: 40.35, lon: -74.66 };

export function MapView() {
  const params = useSearchParams();
  const [events, setEvents] = useState<SkyEvent[]>([]);
  const [eventId, setEventId] = useState<string>(params.get("event") ?? "");
  const [origin, setOrigin] = useState<LatLon>(DEFAULT_ORIGIN);
  const [radiusKm, setRadiusKm] = useState(150);
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [hour, setHour] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load events (with ISS passes for the current origin).
  useEffect(() => {
    fetch(`/api/events?lat=${origin.lat}&lon=${origin.lon}`)
      .then((r) => r.json())
      .then((j) => {
        setEvents(j.events ?? []);
        if (!eventId && j.events?.[0]) setEventId(j.events[0].id);
      })
      .catch(() => setError("Could not load events"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.lat, origin.lon]);

  // Ask for the browser's location once.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  const run = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const body = JSON.stringify({ eventId, origin, radiusKm });
      const s = (await (await fetch("/api/score", { method: "POST", body })).json()) as ScoreResponse & { error?: string };
      if (s.error) throw new Error(s.error);
      setScore(s);
      setHour(s.cells[0]?.bestHour ?? s.hours[0] ?? null);
      // Plan is a second call so the map paints first.
      const p = (await (await fetch("/api/plan", { method: "POST", body })).json()) as PlanResponse & { error?: string };
      if (!p.error) setPlan(p);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [eventId, origin, radiusKm]);

  // Recompute on the hour so the map stays current (team decision: hourly).
  useEffect(() => {
    if (!score) return;
    const msToNextHour = 3600 * 1000 - (Date.now() % (3600 * 1000));
    const t = setTimeout(run, msToNextHour + 5000);
    return () => clearTimeout(t);
  }, [score, run]);

  const selectedEvent = useMemo(() => events.find((e) => e.id === eventId), [events, eventId]);

  return (
    <div className="relative h-full">
      <HeatMap origin={origin} radiusKm={radiusKm} geojson={score?.geojson ?? null} hour={hour} onPickOrigin={setOrigin} />

      <div className="absolute left-4 top-4 w-80 space-y-3">
        <EventPicker
          events={events}
          eventId={eventId}
          onEvent={setEventId}
          origin={origin}
          onOrigin={setOrigin}
          radiusKm={radiusKm}
          onRadius={setRadiusKm}
          onRun={run}
          loading={loading}
        />
        {error && <div className="rounded-lg bg-red-900/70 p-3 text-sm">{error}</div>}
        {plan && <PlanCard result={plan} />}
      </div>

      {score && hour && (
        <div className="absolute bottom-4 left-1/2 w-[min(90vw,40rem)] -translate-x-1/2">
          <TimeSlider hours={score.hours} value={hour} onChange={setHour} eventName={selectedEvent?.name ?? ""} />
        </div>
      )}
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
