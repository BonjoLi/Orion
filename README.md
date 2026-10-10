# Orion — where to watch the sky

HackPHS 2026 · theme "Into the Skies"

**One sentence:** pick a sky event (meteor shower, ISS pass, eclipse); Orion scores every spot within driving reach, hour by hour, on clouds, darkness, the Moon, and where the event sits in the sky, shows it as a heatmap on a world map, and writes you a plan.

**The gap we fill:** event calendars exist, astronomy-weather apps exist, but nothing combines them into "where should I drive to see *this* event, given *tonight's* forecast." Eclipse chasers do this by hand with cloud maps; we do it for every event.

**Example:** Orionids peak Oct 21–22 with a bright Moon. The map goes green only after moonset, so the plan says "leave Princeton by 11 PM, drive to X, watch 2–4 AM."

## Run it

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY for the AI plan (optional)
npm run dev                    # http://localhost:3000
npm run check                  # typecheck
npm run build                  # must pass before pushing
```

Without `ANTHROPIC_API_KEY` everything works; `/api/plan` returns a deterministic template plan with confidence 0.

## Who works on what

| Person | Owns | Files |
|---|---|---|
| Landing | Landing page, copy, visuals, theme | `src/app/page.tsx`, `src/components/Hero.tsx`, `src/components/EventCard.tsx`, `src/components/Nav.tsx`, `src/components/Footer.tsx`, `src/app/globals.css` |
| Map + data | Heatmap, slider, scoring, event data | `src/components/map/*`, `src/lib/score/*`, `src/lib/weather/*`, `src/lib/events/*`, `src/data/*` |
| AI + ship | Plan generation, validation, deploy, Devpost | `src/lib/ai/*`, `src/app/api/*`, Vercel, README/Devpost |

Grep for `TODO(` to find the spots each owner is expected to fill. The landing page only needs to keep the `href="/map"` CTA and the `listEvents()` call; everything else on it is yours.

## File structure

```
src/
├─ app/
│  ├─ layout.tsx              shell: Nav + Footer
│  ├─ globals.css             Tailwind + MapLibre CSS + theme vars
│  ├─ page.tsx                LANDING (landing owner)
│  ├─ map/page.tsx            MAP page (renders MapView)
│  └─ api/
│     ├─ events/route.ts      GET  upcoming events
│     ├─ score/route.ts       POST heatmap scores
│     └─ plan/route.ts        POST AI plan (validated)
├─ components/
│  ├─ Nav.tsx Footer.tsx Hero.tsx EventCard.tsx
│  ├─ map/MapView.tsx         client state: event, origin, radius, hour; calls the APIs; hourly refresh
│  ├─ map/HeatMap.tsx         MapLibre map + heatmap layer + NASA night-lights toggle
│  ├─ map/TimeSlider.tsx      scrub hours in the event window
│  ├─ map/EventPicker.tsx     event / lat-lon / radius controls
│  └─ plan/PlanCard.tsx       renders the plan + confidence
├─ lib/
│  ├─ types.ts                zod schemas + TS types for everything crossing an API boundary
│  ├─ cache.ts                in-memory 1-hour TTL cache
│  ├─ astro/sky.ts            Sun/Moon/radiant altitude, Moon illumination (astronomy-engine)
│  ├─ weather/openMeteo.ts    batched hourly cloud layers (Open-Meteo, free)
│  ├─ weather/sevenTimer.ts   seeing/transparency for top cells (7Timer, optional)
│  ├─ events/catalog.ts       merges showers + eclipses + ISS passes
│  ├─ events/eclipses.ts      USNO solar-eclipse API
│  ├─ events/iss.ts           ISS passes from CelesTrak + SGP4 (satellite.js)
│  ├─ score/grid.ts           lat/lon cells inside the radius (≤120)
│  ├─ score/score.ts          THE SCORE FORMULA (WEIGHTS at top)
│  └─ ai/
│     ├─ client.ts            Anthropic client; MODEL = claude-sonnet-5-5
│     ├─ prompt.ts            frozen system prompt (cached) + table formatter
│     ├─ plan.ts              one structured call → validate → retry ≤2 → fallback
│     └─ validate.ts          every id/time/number in the plan must exist in the table
└─ data/meteor-showers.json   curated showers (radiant RA/Dec, ZHR, peak)
```

## How it works

```
browser ──GET /api/events──────────────▶ curated showers + USNO eclipses + computed ISS passes
browser ──POST /api/score {event,origin,radius}──▶ grid → Open-Meteo (1 batched call) → astronomy per cell-hour
                                                   → score table → GeoJSON → heatmap
browser ──POST /api/plan  (same body)────────────▶ score → ONE Claude call (JSON schema) → validator
                                                   → retry with the violations ≤2 → else template plan
```

The AI never computes anything. The score table is ground truth; the model turns it into words and is checked against it (the pattern from the ContainOS hackathon project: deterministic physics first, bounded LLM second).

### Score (v1, tune by eye)

```
score = 100 · clear · dark · (1 − moonPenalty) · targetUp · darkSky
clear       = 1 − min(1, 1.0·low + 0.8·mid + 0.5·high)      cloud fractions
dark        = sunAlt < −18° → 1 ; < −12° → 0.5 ; else 0       (astronomical / nautical twilight)
moonPenalty = illumination · clamp((moonAlt + 5°) / 30°)
targetUp    = clamp((targetAlt − 10°) / 20°)                  radiant / ISS; eclipses skip dark & Moon
precip > 0  → 0
darkSky     = 1 (hook for light pollution; see roadmap)
```
Map cell color = best hour in the event window; the slider shows any hour. The map recomputes on the hour (weather cache TTL = 1 h). Constants live in `WEIGHTS` in `src/lib/score/score.ts`; the cloud weighting precedent is the AstroWeather Home Assistant integration (cloud ×3, seeing ×2, transparency ×1).

## API contract

`GET /api/events?lat=40.35&lon=-74.66` → `{ events: SkyEvent[] }`

`POST /api/score` body `{ "eventId": "orionids-2026", "origin": {"lat": 40.35, "lon": -74.66}, "radiusKm": 150 }`
→ `ScoreResponse { event, origin, radiusKm, computedAt, hours[], cells[] (sorted), geojson }`
Each GeoJSON feature: `properties { id, score, bestHour, distanceKm, byHour {iso: score} }`.

`POST /api/plan` same body → `{ plan, validation {ok, attempts, violations, fallback}, score }`

All shapes are in `src/lib/types.ts`.

## Data sources (cite these on Devpost)

| What | Source | Terms |
|---|---|---|
| Hourly cloud (low/mid/high), precipitation, visibility, 16 days, global | [Open-Meteo](https://open-meteo.com/en/docs) | free non-commercial, no key, 10k calls/day |
| Seeing / transparency (3-day) | [7Timer ASTRO](https://www.7timer.info/doc.php) | free |
| Solar eclipses | [USNO Astronomical Applications API](https://aa.usno.navy.mil/data/api) | public |
| Meteor showers | curated from [EarthSky's guide](https://earthsky.org/astronomy-essentials/earthskys-meteor-shower-guide/); replace radiants with [IMO](https://www.imo.net/) values | — |
| ISS orbit | [CelesTrak GP data](https://celestrak.org/NORAD/documentation/gp-data-formats.php) + [satellite.js](https://github.com/shashwatak/satellite-js) | public |
| Sun/Moon/radiant positions | [astronomy-engine](https://www.npmjs.com/package/astronomy-engine) | MIT |
| Basemap | [OpenFreeMap](https://openfreemap.org/) (OpenStreetMap data) | free, attribution auto |
| Night lights overlay | [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/) VIIRS Day/Night Band | public |
| AI plan | Claude Sonnet 5.5 via `@anthropic-ai/sdk` | ~1¢ per plan |

## Roadmap (after the skeleton works)

1. Light pollution as a number: sample the World Atlas 2015 GeoTIFF (Falchi et al. 2016, CC BY-NC) or VIIRS radiance into `darkSkyFactor()`.
2. Drive time instead of straight-line radius (OSRM / OpenRouteService isochrones).
3. 7Timer seeing/transparency as extra multipliers for the top cells.
4. Eclipse path membership via USNO `/solar/date?coords=`.
5. ISS: require the station to be sunlit for a "visible" pass.
6. Voice Q&A (ElevenLabs Agents client tools calling `/api/score`).
7. Vetted livestream embeds per event (timeanddate, Virtual Telescope Project, Lowell, NASA).
8. MongoDB Atlas as a shared cache (MLH track).

## Devpost checklist

- [ ] Repo public, README current
- [ ] 2–3 screenshots: landing, heatmap with slider, plan card
- [ ] Data sources credited (table above)
- [ ] Tracks: GenAI, DigitalOcean/Vercel, MongoDB (if cache added)
