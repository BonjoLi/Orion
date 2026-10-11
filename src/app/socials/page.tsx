"use client";

import { useMemo, useState } from "react";

// SOCIALS PAGE — friends list, points leaderboard, and a livestream search.
// Template data for now: wire the friends list and leaderboard to the Flask
// accounts table and the streams to the roadmap's vetted embeds before shipping.

type Friend = {
  handle: string;
  status: "online" | "away";
  lastSeen: string;
  points: number;
};

type Entry = {
  rank: number;
  handle: string;
  points: number;
  /** Highlighted as the signed-in viewer. */
  you?: boolean;
};

type Stream = {
  title: string;
  source: string;
  category: string;
  href: string;
};

const FRIENDS: Friend[] = [
  { handle: "AndromedaAva", status: "online", lastSeen: "now", points: 1240 },
  { handle: "NovaNate", status: "online", lastSeen: "now", points: 980 },
  { handle: "PolarisPri", status: "away", lastSeen: "2 h ago", points: 875 },
  { handle: "LyraLee", status: "online", lastSeen: "now", points: 512 },
  { handle: "CassioCara", status: "away", lastSeen: "yesterday", points: 405 },
  { handle: "SiriusSam", status: "away", lastSeen: "3 d ago", points: 268 },
];

const LEADERBOARD: Entry[] = [
  { rank: 1, handle: "AndromedaAva", points: 1240 },
  { rank: 2, handle: "NovaNate", points: 980 },
  { rank: 3, handle: "PolarisPri", points: 875 },
  { rank: 4, handle: "You", points: 640, you: true },
  { rank: 5, handle: "GalileoGus", points: 512 },
];

const STREAMS: Stream[] = [
  { title: "Virtual Telescope Project — live sky", source: "Virtual Telescope Project", category: "Deep sky", href: "https://www.virtualtelescope.eu/webtv/" },
  { title: "Lowell Observatory — public observing", source: "Lowell Observatory", category: "Observatory", href: "https://lowell.edu/" },
  { title: "timeanddate — live eclipse stream", source: "timeanddate.com", category: "Eclipse", href: "https://www.timeanddate.com/live/" },
  { title: "NASA Live — ISS & launches", source: "NASA", category: "Spaceflight", href: "https://www.nasa.gov/nasalive/" },
  { title: "Griffith Observatory — all-sky cam", source: "Griffith Observatory", category: "Observatory", href: "https://griffithobservatory.org/" },
];

function initial(handle: string): string {
  return handle.charAt(0).toUpperCase();
}

export default function SocialsPage() {
  const [query, setQuery] = useState("");

  const streams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STREAMS;
    return STREAMS.filter((s) =>
      [s.title, s.source, s.category].join(" ").toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <section className="max-w-3xl">
        <p className="mb-3 text-sm uppercase tracking-widest text-sky-300">Social</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Friends, points &amp; live skies.
        </h1>
        <p className="mt-6 text-lg text-slate-300">
          See who&rsquo;s watching tonight, climb the leaderboard, and tune in to a live stream
          while the sky clears.
        </p>
      </section>

      {/* Friends */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold">Friends</h2>
        <p className="mt-2 text-sm text-slate-400">People you follow, and what they&rsquo;re up to tonight.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FRIENDS.map((friend) => (
            <li
              key={friend.handle}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                {initial(friend.handle)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{friend.handle}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      friend.status === "online" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                    aria-hidden="true"
                  />
                  {friend.status === "online" ? "Online now" : `Away · ${friend.lastSeen}`}
                </p>
              </div>
              <p className="ml-auto shrink-0 text-sm text-slate-400">{friend.points} pts</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Points leaderboard */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold">Points leaderboard</h2>
        <p className="mt-2 text-sm text-slate-400">
          Template — points are stored on the Flask accounts table.
        </p>
        <ol className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {LEADERBOARD.map((entry) => (
            <li
              key={entry.handle}
              className={`flex items-center gap-4 px-4 py-3 ${
                entry.you ? "bg-sky-400/10" : ""
              } ${entry.rank !== 1 ? "border-t border-white/5" : ""}`}
            >
              <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-400">
                {entry.rank}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                {initial(entry.handle)}
              </span>
              <span className="truncate font-medium">{entry.handle}</span>
              {entry.you && (
                <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-xs text-sky-200">
                  You
                </span>
              )}
              <span className="ml-auto shrink-0 text-sm text-slate-300">
                {entry.points.toLocaleString()} pts
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Livestream search */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold">Livestreams</h2>
        <p className="mt-2 text-sm text-slate-400">
          Search vetted feeds — observatories, launches and eclipses.
        </p>
        <label className="sr-only" htmlFor="stream-search">
          Search livestreams
        </label>
        <input
          id="stream-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by source, event or category…"
          className="mt-6 w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
        />
        {streams.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No streams match &ldquo;{query}&rdquo;.</p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {streams.map((stream) => (
              <li key={stream.title}>
                <a
                  href={stream.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
                >
                  <p className="text-xs uppercase tracking-wider text-sky-300">{stream.category}</p>
                  <h3 className="mt-2 font-medium">{stream.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{stream.source}</p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

