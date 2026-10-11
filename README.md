# Orion — where to watch the sky

HackPHS 2026 · theme "Into the Skies"

**One sentence:** pick a sky event (meteor shower, ISS pass, eclipse); Orion scores every spot within driving reach, hour by hour, on clouds, darkness, the Moon, and where the event sits in the sky, shows it as a heatmap on a world map, and writes you a plan.

**The gap we fill:** event calendars exist, astronomy-weather apps exist, but nothing combines them into "where should I drive to see *this* event, given *tonight's* forecast." Eclipse chasers do this by hand with cloud maps; we do it for every event.

**Example:** Orionids peak Oct 21–22 with a bright Moon. The map goes green only after moonset, so the plan says "leave Princeton by 11 PM, drive to X, watch 2–4 AM."

## Map (Google Maps)

`/map` is a Google Maps page: a **3D globe** (`Map3DElement`, photorealistic) for the world view, a **search bar** (Places Autocomplete, falls back to Open-Meteo geocoding) that jumps to a place and switches to the **2D vector map** for local panning, and a **side menu** with the event picker, a **"Weather conditions" heatmap toggle**, hour slider, NASA night-lights overlay, Globe/2D switch and the AI plan.

The heatmap is our own data (`/api/score`: Open-Meteo cloud layers × Sun/Moon/radiant geometry), drawn with deck.gl's `HeatmapLayer` (Google's recommended replacement for its removed heatmap; [deprecation note](https://developers.google.com/maps/deprecations#heatmap-layer-js-deprecation), [Google's deck.gl example](https://developers.google.com/maps/documentation/javascript/examples/deckgl-heatmap)). It is **regional by design**: it scores the cells in the current viewport, capped at ~25° × 20° (about the US East Coast), never the whole world. Colors run dark blue (worst) → green (best).

`/map-legacy` is the original MapLibre page (no key needed), kept as a fallback.

### Google key (free, no card)

1. Signed into Google, open https://console.cloud.google.com/google/maps-hosted/tos?ref=https://developers.google.com/maps/ and accept the **Maps Demo Key** terms; the key is shown immediately ([docs](https://developers.google.com/maps/documentation/javascript/demo-key): "no billing information required", covers 2D/3D maps and map IDs; prototyping only).
2. `.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key>` and `NEXT_PUBLIC_GOOGLE_MAP_ID=DEMO_MAP_ID`.
3. Production later (still $0 under 10,000 map loads/month): Cloud console → Billing → APIs & Services → enable **Maps JavaScript API** + **Places API (New)** → Credentials → API key, restricted to your domains → Maps Management → Create map ID (JavaScript → Vector).

## Run it

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY for the AI plan (optional)
npm run dev                    # http://localhost:3000
npm run check                  # typecheck
npm run build                  # must pass before pushing
```

Without `ANTHROPIC_API_KEY` everything works; `/api/plan` returns a deterministic template plan with confidence 0.

### Login (Flask backend)

Accounts live in the Flask app (`Orion/`). Run it next to the Next.js app, in a second terminal (Python 3.10+):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python createDB.py             # makes the tables; keeps existing accounts (add --reset to wipe them)
python wsgi.py                 # Flask on 127.0.0.1:8080
```

Then use the site at **http://localhost:3000** (or this computer's address on your network). Next forwards
`/login`, `/sign-up`, `/logout`, `/profile` and `/account/*` to Flask (`next.config.ts`), so the whole site is one
address, the login cookie works on the map's host, and no link names `localhost`. The signed-in user lands on `/map`;
the map itself stays public. Photo upload and emailed password resets show as "coming soon".

## Who works on what

| Person | Owns | Files |
|---|---|---|
| Landing | Landing page, copy, visuals, theme | `src/app/page.tsx`, `src/components/Hero.tsx`, `src/components/EventCard.tsx`, `src/components/Nav.tsx`, `src/components/Footer.tsx`, `src/app/globals.css` |
| Map + data | Google map, heatmap, side menu, scoring, event data | `src/components/gmap/*`, `src/lib/score/*`, `src/lib/weather/*`, `src/lib/events/*`, `src/data/*` |
| AI + ship | Plan generation, validation, deploy, Devpost | `src/lib/ai/*`, `src/app/api/*`, Vercel, README/Devpost |

Grep for `TODO(` to find the spots each owner is expected to fill. The landing page only needs to keep the `href="/map"` CTA and the `listEvents()` call; everything else on it is yours.

## File structure

```
src/
├─ app/
│  ├─ layout.tsx              shell: Nav + Footer
│  ├─ globals.css             Tailwind + MapLibre CSS + theme vars
│  ├─ page.tsx                LANDING (landing owner)
│  ├─ map/page.tsx            MAP page (Google Maps; renders gmap/MapShell)
│  ├─ map-legacy/page.tsx     fallback MapLibre page (no key)
│  └─ api/
│     ├─ events/route.ts      GET  upcoming events
│     ├─ score/route.ts       POST heatmap scores (radius or viewport mode)
│     ├─ geocode/route.ts     GET place search fallback (Open-Meteo geocoding)
│     └─ plan/route.ts        POST AI plan (validated)
├─ components/
│  ├─ Nav.tsx Footer.tsx Hero.tsx EventCard.tsx
│  ├─ gmap/contracts.ts       props/interfaces shared by the Google-map components (change with care)
│  ├─ gmap/MapShell.tsx       state: view (globe|local), origin, event, hour, toggles; renders the rest
│  ├─ gmap/GlobeView.tsx      Map3DElement globe; flies to the origin
│  ├─ gmap/LocalMap.tsx       2D vector map; fetches /api/score for the viewport (clamped to the cap)
│  ├─ gmap/DeckGlOverlay.tsx  deck.gl GoogleMapsOverlay bridge
│  ├─ gmap/HeatmapLayerFactory.ts  deck.gl HeatmapLayer (MEAN, blue→green, zoom-scaled radius)
│  ├─ gmap/NightLights.tsx    NASA GIBS VIIRS ImageMapType overlay
│  ├─ gmap/SearchBar.tsx      Places Autocomplete → /api/geocode fallback
│  ├─ gmap/SideMenu.tsx       event picker · heatmap toggle · hour slider · night lights · globe/2D · plan
│  ├─ map/*                   legacy MapLibre page components (/map-legacy)
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
│  ├─ score/grid.ts           lat/lon cells inside the radius (≤120; legacy page)
│  ├─ score/bounds.ts         viewport grid: region cap, adaptive step, snapped lattice (≤200 cells)
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

`POST /api/score` body `{ "eventId": "orionids-2026", "origin": {"lat": 40.35, "lon": -74.66}, "radiusKm": 150 }` (radius mode)
or `{ "eventId", "origin", "bounds": {"north","south","east","west"} }` (viewport mode, used by the Google map)
→ `ScoreResponse { event, origin, radiusKm, computedAt, hours[], cells[] (sorted), geojson, points[], bounds?, stepDeg? }`
`points[]`: `{ id, lon, lat, score, bestHour, distanceKm, byHour {iso: score} }` (feeds the deck.gl heatmap).
HTTP 413 `{ error, cap }` when `bounds` exceed the region cap (`REGION_CAP` in `src/lib/score/bounds.ts`).

`GET /api/geocode?q=Princeton` → `{ results: [{ lat, lon, label, country }] }` (Open-Meteo geocoding, free, no key)

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
| Map | [Google Maps Platform](https://developers.google.com/maps/documentation/javascript) (vector map, 3D globe, Places) via [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/) | Demo Key free; 10k loads/month free with billing |
| Heatmap rendering | [deck.gl HeatmapLayer](https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer) on [GoogleMapsOverlay](https://deck.gl/docs/api-reference/google-maps/google-maps-overlay) | MIT |
| Place search fallback | [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | free, no key |
| Basemap (legacy page) | [OpenFreeMap](https://openfreemap.org/) (OpenStreetMap data) | free, attribution auto |
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
