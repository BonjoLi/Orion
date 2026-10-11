import { cached, ONE_HOUR_MS } from "@/lib/cache";
import type { EventKind, SkyEvent } from "@/lib/types";

// Space Calendar JSON feed (lkorth, MIT). Data is generated from USNO + JPL.
// Repo:       https://github.com/lkorth/space-calendar
// Categories: https://github.com/lkorth/space-calendar/blob/main/CATEGORIES.md
// Live-tested 2026-10-10, no key. Single-maintainer service, so every failure
// path returns [] and catalog.ts falls back to the curated + USNO events.

const FEED = "https://space-calendar.lukekorth.com/feed.json";

const CATEGORY_KIND: Record<string, EventKind> = {
  "meteor-showers": "meteor_shower",
  "eclipses-solar": "solar_eclipse",
  "eclipses-lunar": "lunar_eclipse",
  oppositions: "planet",
  elongations: "planet",
  comets: "comet",
  occultations: "occultation",
};

type FeedItem = {
  uid: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  url?: string;
  category: string;
};

export async function spaceCalendarEvents(): Promise<SkyEvent[]> {
  try {
    const items = await cached("spacecal", 6 * ONE_HOUR_MS, fetchFeed);
    return items.flatMap(toEvent);
  } catch {
    return [];
  }
}

async function fetchFeed(): Promise<FeedItem[]> {
  const url = `${FEED}?c=${Object.keys(CATEGORY_KIND).join(",")}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`space-calendar ${res.status}`);
  const json = (await res.json()) as { events?: FeedItem[] };
  return json.events ?? [];
}

function toEvent(item: FeedItem): SkyEvent[] {
  const kind = CATEGORY_KIND[item.category];
  if (!kind) return [];
  const start = new Date(item.start);
  const end = new Date(item.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  return [
    {
      id: item.uid.replace(/@space-calendar$/, ""),
      kind,
      name: item.title.replace(/^[^\p{L}\p{N}]+/u, "").trim(),
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      peak: start.toISOString(),
      description: item.description?.split("\n\n")[0],
      source: item.url,
    },
  ];
}
