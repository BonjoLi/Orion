import demoEvents from "@/data/demo-events.json";
import showers from "@/data/meteor-showers.json";
import { SkyEvent } from "@/lib/types";
import { eclipseEvents } from "@/lib/events/eclipses";
import { spaceCalendarEvents } from "@/lib/events/spaceCalendar";
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

const MAX_ISS_PASSES = 3;

/** First word of a shower name ("Eta Aquariids meteor shower" -> "eta"), used to dedupe. */
const showerKey = (name: string) => name.toLowerCase().split(/\s+/)[0];

/**
 * All events from now, sorted. ISS passes need an origin; pass one to include them.
 * Sources: Space Calendar feed (broad coverage) + curated showers (they carry the
 * radiant that scoring needs, so they win a dedupe) + ISS passes. USNO eclipses
 * are only the fallback for when the feed is down.
 */
export async function listEvents(from: Date, origin?: LatLon): Promise<SkyEvent[]> {
  const feed = await spaceCalendarEvents();
  const curated = showers.map(showerToEvent);
  const curatedKeys = new Set(curated.map((e) => showerKey(e.name)));
  const feedEvents = feed.filter((e) => e.kind !== "meteor_shower" || !curatedKeys.has(showerKey(e.name)));

  const events: SkyEvent[] = [
    ...curated,
    ...feedEvents,
    ...(feed.length === 0 ? await eclipseEvents(from.getUTCFullYear()) : []),
    ...(origin ? (await issPassEvents(origin, from)).slice(0, MAX_ISS_PASSES) : []),
  ];
  const upcoming = events
    .filter((e) => new Date(e.windowEnd).getTime() >= from.getTime())
    .sort((a, b) => a.windowStart.localeCompare(b.windowStart));
  // Demo replays are past events, so they skip the date filter and sit after the live ones.
  return [...upcoming, ...DEMO_EVENTS.filter((d) => !upcoming.some((e) => e.id === d.id))];
}

/** Past events kept for replay demos (validated once at load). */
const DEMO_EVENTS: SkyEvent[] = demoEvents.map((e) => SkyEvent.parse(e));

export async function getEvent(id: string, origin?: LatLon): Promise<SkyEvent | undefined> {
  // Use "now" (not the epoch) so ISS passes are computed over the same window the
  // events list used, keeping their ids stable enough to look the picked pass up.
  const all = await listEvents(new Date(), origin);
  return all.find((e) => e.id === id);
}
