import type { EventKind, SkyEvent } from "@/lib/types";

// "Soonest notable": how notable the kind is, discounted by how far away it is.
// KIND_WEIGHT and the 30-day decay constant (e-folding time) are proposals
// from our own judgment (no source), so they're tunable. Replace with weather-aware ranking
// once the heatmap lands.
const KIND_WEIGHT: Record<EventKind, number> = {
  solar_eclipse: 1.0,
  lunar_eclipse: 0.9,
  meteor_shower: 0.8,
  comet: 0.8,
  planet: 0.6,
  occultation: 0.5,
  iss_pass: 0.4,
};
const DECAY_DAYS = 30;
const MAX_ISS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

function rank(e: SkyEvent, now: Date): number {
  const start = new Date(e.windowStart).getTime();
  const end = new Date(e.windowEnd).getTime();
  const t = now.getTime();
  const proximity = t >= start && t <= end ? 1 : Math.exp(-Math.max(0, start - t) / DAY_MS / DECAY_DAYS);
  return KIND_WEIGHT[e.kind] * proximity;
}

/** Ids of the top `n` upcoming events, best first. At most one ISS pass. */
export function recommend(events: SkyEvent[], now: Date, n = 5): string[] {
  const ranked = events
    .filter((e) => new Date(e.windowEnd).getTime() >= now.getTime())
    .map((e) => ({ e, r: rank(e, now) }))
    .sort((a, b) => b.r - a.r);

  const picked: SkyEvent[] = [];
  for (const { e } of ranked) {
    if (picked.length === n) break;
    if (e.kind === "iss_pass" && picked.filter((p) => p.kind === "iss_pass").length >= MAX_ISS) continue;
    picked.push(e);
  }
  return picked.map((e) => e.id);
}
