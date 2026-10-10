"use client";

import type { LatLon, SkyEvent } from "@/lib/types";

type Props = {
  events: SkyEvent[];
  eventId: string;
  onEvent: (id: string) => void;
  origin: LatLon;
  onOrigin: (p: LatLon) => void;
  radiusKm: number;
  onRadius: (km: number) => void;
  onRun: () => void;
  loading: boolean;
};

export function EventPicker({ events, eventId, onEvent, origin, onOrigin, radiusKm, onRadius, onRun, loading }: Props) {
  return (
    <div className="space-y-3 rounded-xl bg-black/75 p-4 backdrop-blur">
      <label className="block text-xs text-slate-300">
        Event
        <select
          className="mt-1 w-full rounded-md bg-white/10 p-2 text-sm"
          value={eventId}
          onChange={(e) => onEvent(e.target.value)}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} · {new Date(e.peak ?? e.windowStart).toLocaleDateString()}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-slate-300">
          Lat
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-md bg-white/10 p-2 text-sm"
            value={origin.lat}
            onChange={(e) => onOrigin({ ...origin, lat: Number(e.target.value) })}
          />
        </label>
        <label className="block text-xs text-slate-300">
          Lon
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-md bg-white/10 p-2 text-sm"
            value={origin.lon}
            onChange={(e) => onOrigin({ ...origin, lon: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="block text-xs text-slate-300">
        Radius: {radiusKm} km
        <input
          type="range"
          min={25}
          max={500}
          step={25}
          value={radiusKm}
          onChange={(e) => onRadius(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <button
        onClick={onRun}
        disabled={loading || !eventId}
        className="w-full rounded-md bg-sky-300 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {loading ? "Scoring…" : "Find the best spot"}
      </button>
    </div>
  );
}
