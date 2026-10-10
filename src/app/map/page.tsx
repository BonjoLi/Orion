import { Suspense } from "react";
import { MapView } from "@/components/map/MapView";

// MAP PAGE — the product. Client-side state lives in MapView.
// Suspense is required because MapView reads useSearchParams() (?event=...).
export default function MapPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading map…</div>}>
        <MapView />
      </Suspense>
    </div>
  );
}
