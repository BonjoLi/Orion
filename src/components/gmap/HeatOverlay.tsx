"use client";

import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import type { EventPath } from "@/components/gmap/eventPaths";
import { pointsAtHour } from "@/components/gmap/heatHour";
import { renderHeatImage } from "@/components/gmap/heatImage";
import type { ScoreResponse } from "@/lib/types";

const OPACITY = 0.9; // tunable

type Props = {
  score: ScoreResponse;
  /** ISO hour from `score.hours` to draw. */
  hour: string;
  clip?: EventPath["ring"];
};

// Lays the scored heatmap on the map as one image (GroundOverlay), so it stays smooth
// at every zoom. Must render inside <Map> so useMap() finds it. Each hour's image is
// kept, so stepping back to an hour (or looping Play) doesn't redraw it.
// https://developers.google.com/maps/documentation/javascript/reference/image-overlay#GroundOverlay
export function HeatOverlay({ score, hour, clip }: Props) {
  const map = useMap();
  const images = useRef<{ owner: unknown; byHour: Map<string, string | null> }>({ owner: null, byHour: new Map() });

  useEffect(() => {
    if (!map || !score.bounds || !score.stepDeg) return;
    if (images.current.owner !== score || images.current.owner === null) {
      images.current = { owner: score, byHour: new Map() };
    }
    const cache = images.current.byHour;
    if (!cache.has(hour)) {
      cache.set(
        hour,
        renderHeatImage({
          points: pointsAtHour(score.points, hour),
          bounds: score.bounds,
          step: score.stepDeg,
          center: score.origin,
          radiusKm: score.radiusKm,
          clip,
        }),
      );
    }
    const url = cache.get(hour);
    if (!url) return;
    const { north, south, east, west } = score.bounds;
    const overlay = new google.maps.GroundOverlay(url, { north, south, east, west }, { opacity: OPACITY });
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, score, hour, clip]);

  return null;
}
