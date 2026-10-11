"use client";

import { useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import type { EventPath } from "@/components/gmap/eventPaths";
import { bestSharedHour, pointsAtHour } from "@/components/gmap/heatHour";
import { renderHeatImage } from "@/components/gmap/heatImage";
import type { ScoreResponse } from "@/lib/types";

const OPACITY = 0.9; // tunable

// Lays the scored heatmap on the map as one image (GroundOverlay), so it stays smooth
// at every zoom. Must render inside <Map> so useMap() finds it.
// https://developers.google.com/maps/documentation/javascript/reference/image-overlay#GroundOverlay
export function HeatOverlay({ score, clip }: { score: ScoreResponse; clip?: EventPath["ring"] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !score.bounds || !score.stepDeg) return;
    const url = renderHeatImage({
      points: pointsAtHour(score.points, bestSharedHour(score)),
      bounds: score.bounds,
      step: score.stepDeg,
      center: score.origin,
      radiusKm: score.radiusKm,
      clip,
    });
    if (!url) return;
    const { north, south, east, west } = score.bounds;
    const overlay = new google.maps.GroundOverlay(url, { north, south, east, west }, { opacity: OPACITY });
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, score, clip]);

  return null;
}
