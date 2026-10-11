import { Suspense } from "react";
import { MapScreen } from "@/components/gmap/MapScreen";

// MAP PAGE — reached from the "Map" tab in the side menu.
// Suspense is required because MapScreen reads useSearchParams() (?event=...).
export default function MapPage() {
  return (
    <Suspense fallback={<div className="ml-[72px] p-6 text-sm text-slate-400">Loading map…</div>}>
      <MapScreen />
    </Suspense>
  );
}
