"use client";

import type { Replay } from "@/components/gmap/useReplayHour";

type Props = {
  replay: Replay;
  hours: string[];
  /** "Weather from Sep 12, 2026" etc.; says whose weather the replay is showing. */
  weatherNote: string;
  /** When totality really peaks at the searched place, if it is on the path. */
  totalityAt?: string;
};

const utcTime = (iso: string) => iso.slice(11, 16);

// Play button and hour slider for past events. Sits bottom-centre, clear of the legend
// (bottom-left) and the Events button (top-right).
export function HourControls({ replay, hours, weatherNote, totalityAt }: Props) {
  if (hours.length < 2 || !replay.hour) return null;
  return (
    <div className="absolute bottom-8 left-1/2 z-20 w-[min(26rem,calc(100%-22rem))] -translate-x-1/2 rounded-xl border border-white/15 bg-[var(--panel)] px-4 py-3 text-xs text-[var(--ink)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={replay.toggle}
          aria-label={replay.playing ? "Pause replay" : "Play replay"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {replay.playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={hours.length - 1}
          step={1}
          value={replay.index}
          onChange={(e) => replay.seek(Number(e.target.value))}
          aria-label="Hour of the day (UTC)"
          aria-valuetext={`${utcTime(replay.hour)} UTC`}
          className="min-w-0 flex-1 accent-amber-300"
        />
        <span className="w-16 shrink-0 text-right font-medium tabular-nums">{utcTime(replay.hour)} UTC</span>
      </div>
      <p className="mt-2 text-slate-400">
        {weatherNote}
        {totalityAt ? ` · totality here at ${utcTime(totalityAt)} UTC` : ""}
      </p>
    </div>
  );
}
