import showers from "@/data/meteor-showers.json";
import type { SkyEvent } from "@/lib/types";
import { eclipseEvents } from "@/lib/events/eclipses";
import { issPassEvents } from "@/lib/events/iss";
import type { LatLon } from "@/lib/types";

// TODO(data owner): radiant coordinates in meteor-showers.json are approximate
// (from EarthSky / general references). Replace with IMO working-list values
// before the Devpost write-up and cite https://www.imo.net/ in the README.

type ShowerRow = (typeof showers)[number];

function showerToEvent(s: ShowerRow): SkyEvent {
  return {
    id: s.id,
    kind: "meteor_shower",
    name: `${s.name} meteor shower`,
    windowStart: s.windowStart,
    windowEnd: s.windowEnd,
    peak: s.peak,
    target: { ra: s.radiant.raHours, dec: s.radiant.decDeg },
    zhr: s.zhr,
    description: s.description,
    source: s.source,
  };
}

/** All events from now, sorted. ISS passes need an origin; pass one to include them. */
export async function listEvents(from: Date, origin?: LatLon): Promise<SkyEvent[]> {
  const events: SkyEvent[] = [
    ...showers.map(showerToEvent),
    ...(await eclipseEvents(from.getUTCFullYear())),
    ...(origin ? await issPassEvents(origin, from) : []),
  ];
  return events
    .filter((e) => new Date(e.windowEnd).getTime() >= from.getTime())
    .sort((a, b) => a.windowStart.localeCompare(b.windowStart));
}

export async function getEvent(id: string, origin?: LatLon): Promise<SkyEvent | undefined> {
  const all = await listEvents(new Date(0), origin);
  return all.find((e) => e.id === id);
}
