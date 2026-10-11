"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** How long each hour stays on screen while playing. */ // tunable
const STEP_MS = 1000;

export type Replay = {
  /** ISO hour being shown, or undefined when there are no hours. */
  hour: string | undefined;
  index: number;
  playing: boolean;
  toggle: () => void;
  /** Jump to an hour by position; pauses playback. */
  seek: (index: number) => void;
};

/**
 * Steps through `hours` one per second, looping. Starts paused on the hour closest to
 * `startHour` (the eclipse peak), or on the one named by `preferred` (the `?hour=` URL
 * param, a UTC hour of day) when it is in range. Playback pauses when the hours change.
 */
export function useReplayHour(hours: string[], startHour: string | undefined, preferred: number | null): Replay {
  const first = useMemo(() => {
    const wanted = preferred !== null ? hours.findIndex((h) => Number(h.slice(11, 13)) === preferred) : -1;
    if (wanted >= 0) return wanted;
    const peak = startHour ? Date.parse(startHour) : NaN;
    if (Number.isNaN(peak) || hours.length === 0) return 0;
    let best = 0;
    hours.forEach((h, i) => {
      if (Math.abs(Date.parse(h) - peak) < Math.abs(Date.parse(hours[best]) - peak)) best = i;
    });
    return best;
  }, [hours, startHour, preferred]);

  const [state, setState] = useState({ key: hours.join(), index: first, playing: false });
  const key = hours.join();
  // New hours (another place or event): start over, paused.
  const current = state.key === key ? state : { key, index: first, playing: false };

  useEffect(() => {
    if (!current.playing || hours.length < 2) return;
    const id = setInterval(
      () => setState((s) => ({ key, index: ((s.key === key ? s.index : first) + 1) % hours.length, playing: true })),
      STEP_MS,
    );
    return () => clearInterval(id);
  }, [current.playing, hours.length, key, first]);

  const toggle = useCallback(() => setState({ key, index: current.index, playing: !current.playing }), [key, current]);
  const seek = useCallback(
    (index: number) => setState({ key, index: Math.max(0, Math.min(index, hours.length - 1)), playing: false }),
    [key, hours.length],
  );

  return { hour: hours[current.index], index: current.index, playing: current.playing, toggle, seek };
}
