"use client";

import type { GlobeViewProps } from "@/components/gmap/contracts";

// PLACEHOLDER — owner C replaces this file with the Map3DElement globe.
// Kept so MapShell compiles while the globe is being built.
export function GlobeView({ onError, className }: GlobeViewProps) {
  void onError;
  return (
    <div className={`flex h-full w-full items-center justify-center bg-black text-sm text-slate-400 ${className ?? ""}`}>
      Globe view loading…
    </div>
  );
}
