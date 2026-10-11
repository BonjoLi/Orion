import type { EventKind } from "@/lib/types";

export const KIND_LABEL: Record<EventKind, string> = {
  meteor_shower: "Meteor shower",
  iss_pass: "ISS pass",
  solar_eclipse: "Solar eclipse",
  lunar_eclipse: "Lunar eclipse",
  planet: "Planet",
  comet: "Comet",
  occultation: "Occultation",
};

/** Demo replays of past events (src/data/demo-events.json) have ids starting `demo-`. */
export const isDemo = (e: { id: string }) => e.id.startsWith("demo-");

/** A replay is an event that is already over: it gets the hour slider and Play button. */
export const isReplay = (e: { windowEnd: string }, now = Date.now()) => Date.parse(e.windowEnd) < now;
