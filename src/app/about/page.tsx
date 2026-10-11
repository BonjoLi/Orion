// ABOUT PAGE — owned by the landing team.
// Copy mirrors the Flask landing page (Orion/landing/templates/about.html),
// restyled with the app's Tailwind theme classes.

import { Sky } from "@/components/landing/Sky";

const CARDS = [
  {
    kicker: "Live heatmap",
    title: "See where it's actually visible",
    body: "A heatmap combines where each event can be seen with live weather conditions, with AI working on real-time data to point you to the best spots.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <circle cx="6" cy="6" r="1.9" opacity="0.35" />
        <circle cx="12" cy="6" r="1.9" opacity="0.6" />
        <circle cx="18" cy="6" r="1.9" opacity="0.35" />
        <circle cx="6" cy="12" r="1.9" opacity="0.6" />
        <circle cx="12" cy="12" r="2.4" />
        <circle cx="18" cy="12" r="1.9" opacity="0.6" />
        <circle cx="6" cy="18" r="1.9" opacity="0.35" />
        <circle cx="12" cy="18" r="1.9" opacity="0.6" />
        <circle cx="18" cy="18" r="1.9" opacity="0.35" />
      </svg>
    ),
  },
  {
    kicker: "Event tracker",
    title: "Past, present and future",
    body: "Browse a database of past events, follow the ones happening now, and look ahead to predictions for events still to come.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path d="M5 3.8 7.3 8.1 5 12.4 2.7 8.1Z" opacity="0.4" />
        <path d="M12 3.8 14.3 8.1 12 12.4 9.7 8.1Z" opacity="0.7" />
        <path d="M19 3.8 21.3 8.1 19 12.4 16.7 8.1Z" />
      </svg>
    ),
  },
  {
    kicker: "Community",
    title: "Compete and plan together",
    body: "Add friends, earn points for seeing events and livestreaming them, climb the leaderboard, and connect with others to plan trips.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" aria-hidden="true">
        <path d="M12 5.5 4.5 19h15Z" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="12" cy="5.5" r="2" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="19" r="2" fill="currentColor" stroke="none" />
        <circle cx="19.5" cy="19" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    title: "Pick an event",
    body: "Choose something happening now or coming up, or dig into the archive of past events.",
  },
  {
    title: "See the heatmap",
    body: "Visibility and live weather are combined into one map, so the best places to watch stand out at a glance.",
  },
  {
    title: "Plan the trip, then see it",
    body: "Invite friends or connect with other skywatchers, head out together, and earn points for seeing the event and livestreaming it.",
  },
];

const TEAM = ["Matthew Ocampo", "Michael Adasofunjo", "Benjamin Li", "Fangwu Yu"];

const CREDITS = [
  "Weather forecasts: Open-Meteo (hourly low/mid/high cloud cover, precipitation, visibility) and 7Timer! ASTRO (astronomy seeing and transparency)",
  "Sky events: the Space Calendar feed; solar eclipses from the U.S. Naval Observatory (USNO) Astronomical Applications API",
  "ISS passes: CelesTrak orbital elements propagated with satellite.js",
  "Meteor-shower radiants: curated from EarthSky's meteor shower guide",
  "Sun, Moon, and planet positions: astronomy-engine",
  "Maps and search: Google Maps Platform (vector map, 3D globe, Places Autocomplete) with Open-Meteo Geocoding as the search fallback",
  "Legacy map basemap: OpenFreeMap (OpenStreetMap data)",
  "Night-lights overlay: NASA GIBS VIIRS Day/Night Band",
  "AI plan: Anthropic's Claude",
];

export default function AboutPage() {
  return (
    <>
      <Sky />
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        {/* Header */}
        <section className="max-w-3xl">
          <p className="mb-3 text-sm uppercase tracking-widest text-sky-300">About</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Find the best spot to watch the sky, and bring your friends.
          </h1>
          <p className="mt-6 text-lg text-slate-300">
            Orion is an astronomical event tracker and weather tracker in one. A great eclipse, meteor
            shower or satellite pass is only worth the drive if you can actually see it, so Orion shows
            where the event is visible and where the weather will cooperate. Then it helps you plan the
            trip with other people and see who can catch the most.
          </p>
        </section>

        {/* What we do */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold">What we do</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CARDS.map((card) => (
              <div key={card.kicker} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                  {card.icon}
                </div>
                <p className="text-xs uppercase tracking-wider text-sky-300">{card.kicker}</p>
                <h3 className="mt-2 font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-3xl font-light text-sky-300/70">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The team */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold">The team</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((name) => (
              <div key={name} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium">{name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data & credits */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold">Data & credits</h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            Orion stands on open data, public APIs, and the people who maintain them: weather, sky
            events, orbits, night lights, the map, and the AI that writes your plan.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-400">
            {CREDITS.map((credit) => (
              <li key={credit}>{credit}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            Earth imagery on the home page (daytime surface map and 2012 city-lights map): NASA Earth
            Observatory / Visible Earth. NASA does not endorse Orion.
          </p>
        </section>
      </main>
    </>
  );
}
