"use client";

import { useEffect, useMemo, useState } from "react";
import { pathFor } from "@/components/gmap/eventPaths";
import { bestShownScore, blankReason, formatDayUtc, formatHourUtc } from "@/components/gmap/heatHour";
import type { HeatState } from "@/components/gmap/useHeatScore";
import { isDemo, KIND_LABEL } from "@/lib/events/kinds";
import type { SkyEvent } from "@/lib/types";

type Props = {
  events: SkyEvent[];
  recommended: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  status: "loading" | "ready" | "error";
  /** `hasPlace`: the user has searched a location, which the heatmap needs. `hour`: the hour drawn. */
  heat: { on: boolean; onChange: (on: boolean) => void; state: HeatState; hasPlace: boolean; hour?: string };
};

const DAY_MS = 24 * 60 * 60 * 1000;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function when(e: SkyEvent): string {
  const start = new Date(e.windowStart).getTime();
  const end = new Date(e.windowEnd).getTime();
  const now = Date.now();
  if (now >= start && now <= end) return "happening now";
  const date = shortDate(e.peak ?? e.windowStart);
  if (now > end) return `${date} · replay`;
  const days = Math.ceil((start - now) / DAY_MS);
  if (days <= 1) return `tomorrow · ${date}`;
  return days < 60 ? `in ${days} days · ${date}` : date;
}

/** One line under the heatmap toggle: what the map is doing or why it is empty. */
function heatStatus(
  event: SkyEvent | undefined,
  on: boolean,
  hasPlace: boolean,
  state: HeatState,
  hour: string | undefined,
): string | null {
  if (!on) return null;
  if (!event) return "Pick an event, then search your location.";
  if (!hasPlace) return "Search your location to see the heatmap.";
  switch (state.phase) {
    case "loading":
      return "Scoring spots…";
    case "ready": {
      const shown = hour ?? state.score.hours[0];
      const blank = blankReason(state.score, event.kind, shown, pathFor(event.id) !== undefined);
      if (blank) return blank;
      const replayNote = event.weatherDate ? ` · weather from ${formatDayUtc(event.weatherDate)}` : "";
      return `${state.score.points.length} spots scored · best ${bestShownScore(state.score, shown)}/100 at ${formatHourUtc(shown)}${replayNote}`;
    }
    case "unavailable":
      return `Weather forecast available from ${shortDate(state.availableFrom)}.`;
    case "busy":
      return "Weather service is busy, retrying shortly…";
    case "error":
      return "Couldn’t load the heatmap. Try again.";
    default:
      return null;
  }
}

// Right-hand toggleable panel: search, Top 5, a one-at-a-time dropdown, and the heatmap toggle.
export function EventsPanel({ events, recommended, selectedId, onSelect, status, heat }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const byId = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const selected = selectedId ? byId.get(selectedId) : undefined;

  const matches = (e: SkyEvent) => {
    const q = query.trim().toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || KIND_LABEL[e.kind].toLowerCase().includes(q);
  };
  const top = recommended.flatMap((id) => byId.get(id) ?? []).filter(matches);
  const groups = useMemo(() => {
    const out = new Map<SkyEvent["kind"] | "demo", SkyEvent[]>();
    for (const e of events.filter(matches)) {
      const group = isDemo(e) ? "demo" : e.kind;
      out.set(group, [...(out.get(group) ?? []), e]);
    }
    return [...out.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, query]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="events-panel"
          className="fixed right-3 top-3 z-30 rounded-full border border-white/15 bg-[var(--panel)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Events
        </button>
      )}

      <aside
        id="events-panel"
        aria-label="Astronomical events"
        aria-hidden={!open}
        inert={!open}
        className={`fixed right-0 top-0 z-30 flex h-screen w-80 max-w-[88vw] flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[var(--panel)] p-4 text-[var(--ink)] transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.18em] text-slate-400">Astronomical events</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close events panel"
            className="rounded-md px-2 py-1 text-slate-300 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {selected && (
          <div className="rounded-lg border border-sky-300/40 bg-sky-300/10 p-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-sky-200">{KIND_LABEL[selected.kind]}</p>
            <p className="mt-1 font-medium">{selected.name}</p>
            <p className="mt-1 text-xs text-slate-300">{when(selected)}</p>
            {selected.description && <p className="mt-2 text-xs text-slate-300">{selected.description}</p>}
            <div className="mt-2 flex items-center justify-between text-xs">
              {selected.source ? (
                <a href={selected.source} target="_blank" rel="noreferrer" className="text-sky-300 underline">
                  Source
                </a>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => onSelect(null)} className="text-slate-300 underline">
                Clear
              </button>
            </div>
          </div>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events…"
          aria-label="Search events"
          className="w-full rounded-md bg-white/10 px-3 py-2 text-sm placeholder:text-slate-400"
        />

        {status === "loading" && <p className="text-sm text-slate-400">Loading events…</p>}
        {status === "error" && <p className="text-sm text-red-300">Couldn’t load events. Try reloading.</p>}

        {status === "ready" && (
          <>
            <section>
              <h3 className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Top 5 recommended</h3>
              {top.length === 0 ? (
                <p className="text-sm text-slate-400">No matches.</p>
              ) : (
                <ul className="grid gap-1">
                  {top.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(e.id)}
                        aria-pressed={e.id === selectedId}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/10 ${
                          e.id === selectedId ? "bg-white/10" : ""
                        }`}
                      >
                        <span className="block">{e.name}</span>
                        <span className="block text-xs text-slate-400">
                          {KIND_LABEL[e.kind]} · {when(e)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <label htmlFor="all-events" className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
                All events
              </label>
              <select
                id="all-events"
                value={selectedId ?? ""}
                onChange={(e) => onSelect(e.target.value || null)}
                className="w-full rounded-md bg-white/10 px-2 py-2 text-sm"
              >
                <option value="">Select an event…</option>
                {groups.map(([kind, list]) => (
                  <optgroup key={kind} label={kind === "demo" ? "Demo replay" : KIND_LABEL[kind]}>
                    {list.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </section>
          </>
        )}

        <div className="mt-auto rounded-md bg-white/5 px-3 py-2 text-sm">
          <label className="flex items-center justify-between">
            Heatmap
            <input type="checkbox" checked={heat.on} onChange={(e) => heat.onChange(e.target.checked)} />
          </label>
          <p role="status" className="mt-1 text-xs text-slate-400">
            {heatStatus(selected, heat.on, heat.hasPlace, heat.state, heat.hour)}
          </p>
        </div>
      </aside>
    </>
  );
}
