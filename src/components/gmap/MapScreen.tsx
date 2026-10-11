"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EventsPanel } from "@/components/events/EventsPanel";
import type { PlaceSelection } from "@/components/gmap/contracts";
import { pathFor, pathFromRing } from "@/components/gmap/eventPaths";
import { blankReason, formatDayUtc, formatHourUtc, shownHour } from "@/components/gmap/heatHour";
import { HeatLegend } from "@/components/gmap/HeatLegend";
import { HourControls } from "@/components/gmap/HourControls";
import { LocalMap } from "@/components/gmap/LocalMap";
import { SearchBar } from "@/components/gmap/SearchBar";
import { useHeatScore } from "@/components/gmap/useHeatScore";
import { useReplayHour } from "@/components/gmap/useReplayHour";
import { isReplay } from "@/lib/events/kinds";
import { HEATMAP_RADIUS_KM } from "@/lib/geo";
import type { ScoreResponse, SkyEvent } from "@/lib/types";

const NO_HOURS: string[] = [];

// Princeton, used for ISS passes until the user picks a place. The heatmap never uses it.
const DEFAULT_ORIGIN = { lat: 40.35, lon: -74.66 };

type EventsResponse = { events: SkyEvent[]; recommended: string[] };

/** Place from `?lat=&lon=&place=`; the URL is user-editable, so validate. */
function parseOrigin(params: URLSearchParams): PlaceSelection | undefined {
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!params.get("lat") || !params.get("lon")) return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat, lon, label: (params.get("place") ?? "Selected place").slice(0, 200) };
}

/** `?hour=HH`: the hour a replay starts on (UTC). Mostly for screenshots and shared links. */
function parseHour(params: URLSearchParams): number | null {
  const raw = params.get("hour");
  if (raw === null || !/^\d{1,2}$/.test(raw)) return null;
  const hour = Number(raw);
  return hour >= 0 && hour <= 23 ? hour : null;
}

/** Legend footnote: why the map is blank, or which hour (and whose weather) it shows. */
function legendCaption(score: ScoreResponse, event: SkyEvent | undefined, hour: string, pathDrawn: boolean): string {
  const blank = event && blankReason(score, event.kind, hour, pathDrawn);
  if (blank) return blank;
  // The hour controls already say whose weather a replay shows; keep the legend short.
  return event?.weatherDate ? `Replay at ${hour.slice(11, 16)} UTC` : `Conditions at ${formatHourUtc(hour)}`;
}

// The map, search bar and events panel. State lives in the URL (`?event=`,
// `?lat=&lon=&place=`) so a refresh keeps it and the heatmap can read it.
export function MapScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("event");
  const paramsKey = params.toString();
  const origin = useMemo(() => parseOrigin(new URLSearchParams(paramsKey)), [paramsKey]);
  const lat = origin?.lat ?? DEFAULT_ORIGIN.lat;
  const lon = origin?.lon ?? DEFAULT_ORIGIN.lon;

  const [data, setData] = useState<EventsResponse>({ events: [], recommended: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [heatOn, setHeatOn] = useState(true);
  // The heatmap needs both an event and the user's place; picking an event alone draws nothing.
  const heat = useHeatScore(selectedId, origin, heatOn);
  const heatActive = heatOn && selectedId !== null && origin !== undefined;
  const selectedEvent = data.events.find((e) => e.id === selectedId);
  const path = pathFor(selectedId) ?? (selectedEvent?.footprint ? pathFromRing(selectedEvent.footprint.ring) : undefined);

  // Past events get Play + an hour slider; everything else shows the area's best hour.
  const score = heat.phase === "ready" ? heat.score : null;
  const replayOn = score !== null && selectedEvent !== undefined && isReplay(selectedEvent);
  const replay = useReplayHour(
    replayOn ? score.hours : NO_HOURS,
    selectedEvent?.peak,
    parseHour(new URLSearchParams(paramsKey)),
  );
  const hour = score ? shownHour(score, replayOn ? replay.hour : undefined) : undefined;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/events?lat=${lat}&lon=${lon}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<EventsResponse>;
      })
      .then((json) => {
        setData(json);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setStatus("error");
      });
    return () => ctrl.abort();
  }, [lat, lon]);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(paramsKey);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [paramsKey, pathname, router],
  );

  const selectEvent = useCallback((id: string | null) => setParams({ event: id }), [setParams]);
  const selectPlace = useCallback(
    (p: PlaceSelection) => setParams({ lat: p.lat.toFixed(5), lon: p.lon.toFixed(5), place: p.label }),
    [setParams],
  );

  return (
    <div className="relative ml-[72px] h-screen">
      <LocalMap
        origin={origin}
        heat={score}
        heatHour={hour}
        coverageKm={heatActive ? HEATMAP_RADIUS_KM : undefined}
        path={path}
      >
        <SearchBar
          onSelect={selectPlace}
          placeholder={
            selectedId && !origin
              ? path
                ? "Search a place inside the blue path"
                : "Search your location to see the heatmap"
              : undefined
          }
        />
        {(score || path) && (
          <HeatLegend
            showHeat={score !== null}
            showPath={path !== undefined}
            pathLabel={selectedEvent?.kind === "iss_pass" ? "ISS pass footprint" : undefined}
            caption={score && hour ? legendCaption(score, selectedEvent, hour, path !== undefined) : undefined}
          />
        )}
        {replayOn && selectedEvent?.weatherDate && (
          <HourControls
            replay={replay}
            hours={score.hours}
            weatherNote={`Weather from ${formatDayUtc(selectedEvent.weatherDate)}`}
            totalityAt={score.totalityAt}
          />
        )}
      </LocalMap>
      <EventsPanel
        events={data.events}
        recommended={data.recommended}
        selectedId={selectedId}
        onSelect={selectEvent}
        status={status}
        heat={{ on: heatOn, onChange: setHeatOn, state: heat, hasPlace: origin !== undefined, hour }}
      />
    </div>
  );
}
