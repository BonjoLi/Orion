import Link from "next/link";
import type { SkyEvent } from "@/lib/types";

const KIND_LABEL: Record<SkyEvent["kind"], string> = {
  meteor_shower: "Meteor shower",
  iss_pass: "ISS pass",
  solar_eclipse: "Solar eclipse",
  lunar_eclipse: "Lunar eclipse",
};

export function EventCard({ event }: { event: SkyEvent }) {
  const when = new Date(event.peak ?? event.windowStart);
  return (
    <Link
      href={`/map?event=${encodeURIComponent(event.id)}`}
      className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-sky-300/50"
    >
      <p className="text-xs uppercase tracking-wider text-slate-400">{KIND_LABEL[event.kind]}</p>
      <h3 className="mt-1 font-semibold">{event.name}</h3>
      <p className="mt-1 text-sm text-slate-300">
        {when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </p>
      {event.description && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{event.description}</p>}
    </Link>
  );
}
