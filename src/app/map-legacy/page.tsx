import { Suspense } from "react";
import { MapView } from "@/components/map/MapView";

// Fallback map (MapLibre, no Google key needed). Kept so the app always has
// a working map even if the Google Maps key or 3D library fails.
export default function LegacyMapPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading map…</div>}>
        <MapView />
      </Suspense>
    </div>
  );
}
