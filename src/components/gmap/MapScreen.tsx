"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EventsPanel } from "@/components/events/EventsPanel";
import type { PlaceSelection } from "@/components/gmap/contracts";
import { bestSharedHour, bestShownScore, emptyHeatMessage, formatHourUtc } from "@/components/gmap/heatHour";
import { pathFor } from "@/components/gmap/eventPaths";
import { HeatLegend } from "@/components/gmap/HeatLegend";
import { LocalMap } from "@/components/gmap/LocalMap";
import { SearchBar } from "@/components/gmap/SearchBar";
import { useHeatScore } from "@/components/gmap/useHeatScore";
import { HEATMAP_RADIUS_KM } from "@/lib/geo";
import type { ScoreResponse, SkyEvent } from "@/lib/types";

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

/** Legend footnote: the hour shown, or why the map is blank. */
function legendCaption(score: ScoreResponse, kind: SkyEvent["kind"] | undefined, pathDrawn: boolean): string {
  if (bestShownScore(score) > 0 || !kind) return `Conditions at ${formatHourUtc(bestSharedHour(score))}`;
  return emptyHeatMessage(kind, score.radiusKm, pathDrawn);
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
  const selectedKind = data.events.find((e) => e.id === selectedId)?.kind;
  const path = pathFor(selectedId);

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
        heat={heat.phase === "ready" ? heat.score : null}
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
        {(heat.phase === "ready" || path) && (
          <HeatLegend
            showHeat={heat.phase === "ready"}
            showPath={path !== undefined}
            caption={heat.phase === "ready" ? legendCaption(heat.score, selectedKind, path !== undefined) : undefined}
          />
        )}
      </LocalMap>
      <EventsPanel
        events={data.events}
        recommended={data.recommended}
        selectedId={selectedId}
        onSelect={selectEvent}
        status={status}
        heat={{ on: heatOn, onChange: setHeatOn, state: heat, hasPlace: origin !== undefined }}
      />
    </div>
  );
}
