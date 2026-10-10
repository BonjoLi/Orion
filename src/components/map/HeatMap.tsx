"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapMouseEvent,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { LatLon } from "@/lib/types";

// MapLibre heatmap bound to the /api/score GeoJSON. Each feature carries
// `score` (best hour) and `byHour` {iso: score}; the slider picks the hour.
// Heatmap layer docs: https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer/

const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/positron";

// NASA GIBS VIIRS night lights (free WMTS). maxNativeZoom 8. Date = any recent day.
// https://nasa-gibs.github.io/gibs-api-docs/access-basics/
function gibsNightLightsUrl(date: string): string {
  return `https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_AtSensor_M15/default/${date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
}

type Props = {
  origin: LatLon;
  radiusKm: number;
  geojson: FeatureCollection<Point> | null;
  hour: string | null;
  onPickOrigin?: (p: LatLon) => void;
};

export function HeatMap({ origin, radiusKm, geojson, hour, onPickOrigin }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [nightLights, setNightLights] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE,
      center: [origin.lon, origin.lat],
      zoom: 6,
    });
    map.addControl(new NavigationControl(), "top-right");
    map.on("load", () => {
      map.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "cells-heat",
        type: "heatmap",
        source: "cells",
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "score"], 0, 0, 100, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 9, 2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 3, 10, 9, 60],
          "heatmap-opacity": 0.75,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(30,64,175,0.6)",
            0.5, "rgba(14,165,233,0.8)",
            0.8, "rgba(250,204,21,0.9)",
            1, "rgba(34,197,94,1)",
          ],
        },
      });
      // Point layer at high zoom so individual cells are inspectable.
      map.addLayer({
        id: "cells-points",
        type: "circle",
        source: "cells",
        minzoom: 8,
        paint: {
          "circle-radius": 6,
          "circle-color": ["interpolate", ["linear"], ["get", "score"], 0, "#1e3a8a", 50, "#0ea5e9", 100, "#22c55e"],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1,
        },
      });
      map.on("click", "cells-points", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { id: string; score: number; bestHour: string; distanceKm: number };
        new Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<b>Score ${p.score}</b><br/>best ${new Date(p.bestHour).toLocaleString()}<br/>${p.distanceKm} km away`)
          .addTo(map);
      });
      map.on("dblclick", (e: MapMouseEvent) => {
        onPickOrigin?.({ lat: Math.round(e.lngLat.lat * 100) / 100, lon: Math.round(e.lngLat.lng * 100) / 100 });
      });
      setLoaded(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push new data / selected hour into the source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const src = map.getSource("cells") as GeoJSONSource | undefined;
    if (!src) return;
    if (!geojson) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const features = geojson.features.map((f) => {
      const byHour = (f.properties?.byHour ?? {}) as Record<string, number>;
      const score = hour && byHour[hour] !== undefined ? byHour[hour] : (f.properties?.score as number);
      return { ...f, properties: { ...f.properties, score } };
    });
    src.setData({ type: "FeatureCollection", features });
  }, [geojson, hour, loaded]);

  // Recenter when origin changes.
  useEffect(() => {
    mapRef.current?.easeTo({ center: [origin.lon, origin.lat] });
  }, [origin.lat, origin.lon]);

  // Toggle GIBS night-lights overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const id = "night-lights";
    if (nightLights && !map.getSource(id)) {
      const date = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      map.addSource(id, {
        type: "raster",
        tiles: ["a", "b", "c"].map((s) => gibsNightLightsUrl(date).replace("{s}", s)),
        tileSize: 256,
        maxzoom: 8,
        attribution: "NASA GIBS / VIIRS",
      });
      map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": 0.6 } }, "cells-heat");
    } else if (!nightLights && map.getLayer(id)) {
      map.removeLayer(id);
      map.removeSource(id);
    }
  }, [nightLights, loaded]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <label className="absolute right-4 bottom-10 flex items-center gap-2 rounded-lg bg-black/70 px-3 py-2 text-xs">
        <input type="checkbox" checked={nightLights} onChange={(e) => setNightLights(e.target.checked)} />
        Night lights (NASA)
      </label>
      <div className="absolute right-4 bottom-4 text-[10px] text-slate-400">
        radius {radiusKm} km · double-click to move origin
      </div>
    </div>
  );
}
