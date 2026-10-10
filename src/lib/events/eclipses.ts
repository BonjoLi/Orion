import { cached } from "@/lib/cache";
import type { SkyEvent } from "@/lib/types";

// USNO Astronomical Applications API — solar eclipses by year, no key.
// Docs: https://aa.usno.navy.mil/data/api
// Live-tested 2026-10-10: 2026 → Feb 17 annular, Aug 12 total; 2027 → Feb 6 annular, Aug 2 total.
//
// TODO(data owner): the USNO "date" endpoint gives local circumstances for a
// lat/lon (https://aa.usno.navy.mil/api/eclipses/solar/date?date=YYYY-MM-DD&coords=LAT,LON).
// Use it in score.ts to set targetUp = 1 inside the path, obscuration fraction outside.
// Lunar eclipses are not in this API; add a curated entry if one is in range.

type UsnoYear = {
  eclipses_in_year: { day: number; month: number; year: number; event: string }[];
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function eclipseEvents(fromYear: number): Promise<SkyEvent[]> {
  const years = [fromYear, fromYear + 1];
  const lists = await Promise.all(years.map(fetchYear));
  return lists.flat().map((e) => {
    const day = new Date(Date.UTC(e.year, e.month - 1, e.day));
    const slug = e.event.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return {
      id: slug,
      kind: "solar_eclipse",
      name: e.event,
      windowStart: day.toISOString(),
      windowEnd: new Date(day.getTime() + ONE_DAY_MS).toISOString(),
      description: "Solar eclipse. Visibility depends on being inside the eclipse path.",
      source: "https://aa.usno.navy.mil/data/api",
    } satisfies SkyEvent;
  });
}

async function fetchYear(year: number): Promise<UsnoYear["eclipses_in_year"]> {
  return cached(`usno:${year}`, 7 * ONE_DAY_MS, async () => {
    const res = await fetch(`https://aa.usno.navy.mil/api/eclipses/solar/year?year=${year}`);
    if (!res.ok) return [];
    const json = (await res.json()) as UsnoYear;
    return json.eclipses_in_year ?? [];
  });
}
