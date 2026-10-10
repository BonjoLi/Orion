"use client";

import { useState } from "react";
import type { GeocodeResponse, SearchBarProps } from "@/components/gmap/contracts";

// PLACEHOLDER — owner C replaces this with PlaceAutocompleteElement.
// This fallback hits /api/geocode so the flow works before C lands.
export function SearchBar({ onSelect, placeholder = "Search a place…", className }: SearchBarProps) {
  const [q, setQ] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const json = (await res.json()) as GeocodeResponse;
    const hit = json.results?.[0];
    if (hit) onSelect({ lat: hit.lat, lon: hit.lon, label: hit.label });
  }
  return (
    <form onSubmit={submit} className={className}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400"
      />
    </form>
  );
}
