import { Sky } from "@/components/landing/Sky";

// SOCIALS PAGE — friends list, points leaderboard, and event replays.
// Template data for now: wire the friends list and leaderboard to the Flask
// accounts table. The replays are real YouTube recordings of past events.

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

type Replay = {
  /** YouTube video id — the value after /watch?v=. */
  id: string;
  title: string;
  channel: string;
  category: string;
  date: string;
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
  { rank: 4, handle: "GalileoGus", points: 512 },
  { rank: 5, handle: "You", points: 0, you: true },
];

const REPLAYS: Replay[] = [
  {
    id: "2MJY_ptQW1o",
    title: "2024 Total Solar Eclipse: Through the Eyes of NASA",
    channel: "NASA",
    category: "Eclipse",
    date: "Apr 8, 2024",
  },
  {
    id: "ArwVHSydxIw",
    title: "NASA Coverage of the 2017 Total Solar Eclipse",
    channel: "PBS NewsHour",
    category: "Eclipse",
    date: "Aug 21, 2017",
  },
  {
    id: "4czjS9h4Fpg",
    title: "Perseverance Rover's Descent and Touchdown on Mars",
    channel: "NASA",
    category: "Mars",
    date: "Feb 18, 2021",
  },
  {
    id: "A0FZIwabctw",
    title: "Falcon Heavy & Starman",
    channel: "SpaceX",
    category: "Spaceflight",
    date: "Feb 6, 2018",
  },
  {
    id: "0Q6DTouuLX0",
    title: "Total Lunar Eclipse (Blood Moon)",
    channel: "Griffith Observatory",
    category: "Eclipse",
    date: "May 15, 2022",
  },
];

// One of a small set of gradients per handle, chosen deterministically so the
// avatar colour never changes between visits.
const AVATAR_GRADIENTS = [
  "from-sky-400 to-indigo-500",
  "from-fuchsia-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-blue-500",
];

function gradientFor(handle: string): string {
  let hash = 0;
  for (let i = 0; i < handle.length; i += 1) {
    hash = (hash * 31 + handle.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function initial(handle: string): string {
  return handle.charAt(0).toUpperCase();
}

function Avatar({ name, size = "h-11 w-11 text-sm" }: { name: string; size?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br ${gradientFor(
        name,
      )} ${size} font-semibold text-white shadow-lg shadow-black/20`}
    >
      {initial(name)}
    </span>
  );
}

// Top-three podium colours; everyone below falls back to a neutral medal.
const MEDALS = [
  "border-amber-300/30 bg-amber-300/15 text-amber-300",
  "border-slate-200/25 bg-slate-200/10 text-slate-200",
  "border-orange-300/30 bg-orange-300/15 text-orange-300",
];

export default function SocialsPage() {
  const onlineCount = FRIENDS.filter((f) => f.status === "online").length;
  const topScore = LEADERBOARD.reduce((max, e) => Math.max(max, e.points), 0);

  return (
    <>
      <Sky />
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16">
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

          {/* Quick stats */}
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200">
              <span className="font-semibold text-emerald-300">{onlineCount}</span> friends online
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200">
              <span className="font-semibold text-sky-300">{topScore.toLocaleString()}</span> top score
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200">
              <span className="font-semibold text-rose-300">{REPLAYS.length}</span> live events
            </span>
          </div>
        </section>

        {/* Friends */}
        <section className="mt-16">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M3.5 19c.5-3 2.8-4.5 5.5-4.5s5 1.5 5.5 4.5" />
                <path d="M15.5 15.5c.5-2 1.9-3 3.5-3s3 1 3.5 3" />
              </svg>
            </span>
            <h2 className="text-xl font-semibold">Friends</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">People you follow, and what they&rsquo;re up to tonight.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRIENDS.map((friend) => (
              <li
                key={friend.handle}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
              >
                <Avatar name={friend.handle} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{friend.handle}</p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    {friend.status === "online" ? (
                      <span className="relative flex h-2 w-2" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                    )}
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
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M7 4h10v4a5 5 0 0 1-10 0Z" />
                <path d="M7 5H4.5a2 2 0 0 0 2 4" />
                <path d="M17 5h2.5a2 2 0 0 1-2 4" />
                <path d="M12 13v3.5" />
                <path d="M8 20h8" />
              </svg>
            </span>
            <h2 className="text-xl font-semibold">Points leaderboard</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Template — points are stored on the Flask accounts table.
          </p>
          <ol className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {LEADERBOARD.map((entry) => (
              <li
                key={entry.handle}
                className={`flex items-center gap-4 px-4 py-3 ${entry.you ? "bg-sky-400/10" : ""
                  } ${entry.rank !== 1 ? "border-t border-white/5" : ""}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${MEDALS[entry.rank - 1] ?? "border-white/10 bg-white/5 text-slate-400"
                    }`}
                >
                  {entry.rank}
                </span>
                <Avatar name={entry.handle} size="h-8 w-8 text-xs" />
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

        {/* Event replays */}
        <section className="mt-16">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5Z" />
              </svg>
            </span>
            <h2 className="text-xl font-semibold">Watch replays</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Real footage from events that already happened — press play.
          </p>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {REPLAYS.map((video) => (
              <li key={video.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <div className="aspect-video w-full bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wider text-sky-300">{video.category}</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{video.date}</span>
                  </div>
                  <h3 className="mt-2 font-medium">{video.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{video.channel}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

