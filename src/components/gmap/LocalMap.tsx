"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { AdvancedMarker, APIProvider, Circle, Map, Polygon, useMap } from "@vis.gl/react-google-maps";
import type { PlaceSelection } from "@/components/gmap/contracts";
import type { EventPath } from "@/components/gmap/eventPaths";
import { HeatOverlay } from "@/components/gmap/HeatOverlay";
import { RADIUS_M, radiusBounds } from "@/lib/geo";
import type { Bounds, ScoreResponse } from "@/lib/types";

const PRINCETON = { lat: 40.35, lng: -74.66 };

// Web Mercator ends at ±85.0511°; past that Google draws gray. Latitude-only
// bounds (west/east ±180) keep east–west wrapping. strictBounds also caps zoom-out.
// https://developers.google.com/maps/documentation/javascript/reference/map#MapRestriction
const WORLD_BOUNDS = { north: 85.0511, south: -85.0511, west: -180, east: 180 };

const FIT_PADDING_PX = 24;
/** Extra room on the right so the open Events panel (320 px + margin) doesn't cover the path. */
const PANEL_PADDING_PX = 344;

// Zooms the map to `view` whenever it changes: the 5-mile area around a searched
// place, the whole heatmap circle once an event is also picked, or the event's path.
function FitToView({ view, padRight = FIT_PADDING_PX }: { view: Bounds; padRight?: number }) {
  const map = useMap();
  const { north, south, east, west } = view;
  useEffect(() => {
    if (!map) return;
    map.fitBounds(
      { north, south, east, west },
      { top: FIT_PADDING_PX, bottom: FIT_PADDING_PX, left: FIT_PADDING_PX, right: padRight },
    );
  }, [map, north, south, east, west, padRight]);
  return null;
}

type Props = {
  /** The searched / detected place. Draws a pin and centres the view on it. */
  origin?: PlaceSelection;
  /** Scored area for the selected event, drawn as a heatmap. */
  heat?: ScoreResponse | null;
  /**
   * Radius (km) the heatmap covers around `origin`. Draws an outline ring and zooms out
   * to fit it, so the area is clear even while scores load. Unset = just the 5-mile view.
   */
  coverageKm?: number;
  /** Where the selected event can be seen (e.g. the eclipse's path of totality), drawn as a blue band. */
  path?: EventPath;
  /** Rendered inside the map provider (so they can use the Maps hooks), e.g. the search bar. */
  children?: ReactNode;
};

// Pannable, zoomable Google vector map. Heatmap and globe plug in here later.
export function LocalMap({ origin, heat, coverageKm, path, children }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";
  // A searched place wins and is centred exactly (not on the snapped score grid).
  // With no place yet, show the event's whole path instead.
  const viewMeters = coverageKm ? coverageKm * 1000 : RADIUS_M;
  const view = origin ? radiusBounds({ lat: origin.lat, lon: origin.lon }, viewMeters) : path?.bounds;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
        <p>
          Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code> to load the map, or use the{" "}
          <Link href="/map-legacy" className="text-sky-300 underline">
            fallback map
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId={mapId}
        renderingType="VECTOR"
        colorScheme="DARK"
        defaultCenter={PRINCETON}
        defaultZoom={4}
        minZoom={2}
        maxZoom={18}
        restriction={{ latLngBounds: WORLD_BOUNDS, strictBounds: true }}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
      >
        {view && <FitToView view={view} padRight={origin ? FIT_PADDING_PX : PANEL_PADDING_PX} />}
        {path && (
          <Polygon
            paths={path.ring}
            strokeColor="#60a5fa"
            strokeWeight={1.5}
            fillColor="#1e3a8a"
            // Google draws this above the heat image, so thin it out while colours show through.
            fillOpacity={heat ? 0.3 : 0.55}
            clickable={false}
          />
        )}
        {heat && <HeatOverlay score={heat} clip={path?.ring} />}
        {origin && (
          <>
            <AdvancedMarker position={{ lat: origin.lat, lng: origin.lon }} title={origin.label} />
            {coverageKm ? (
              <Circle
                center={{ lat: origin.lat, lng: origin.lon }}
                radius={coverageKm * 1000}
                strokeColor="#fcd34d"
                strokeWeight={2}
                fillOpacity={0}
                clickable={false}
              />
            ) : (
              <Circle
                center={{ lat: origin.lat, lng: origin.lon }}
                radius={RADIUS_M}
                strokeColor="#7dd3fc"
                strokeWeight={1.5}
                fillColor="#7dd3fc"
                fillOpacity={0.08}
                clickable={false}
              />
            )}
          </>
        )}
      </Map>
      {children}
    </APIProvider>
  );
}
