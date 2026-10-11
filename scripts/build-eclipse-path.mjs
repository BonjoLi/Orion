// Builds the outline of an eclipse's path of totality as a GeoJSON polygon.
//
//   node scripts/build-eclipse-path.mjs
//
// For each longitude it finds the north and south edge of the band where
// astronomy-engine reports a total eclipse (the same test src/lib/score/eclipse.ts
// uses for scoring), so the drawn band and the heatmap's zero-score area agree.
// astronomy-engine: https://www.npmjs.com/package/astronomy-engine
// NASA's own path (shapefile, for comparison): https://svs.gsfc.nasa.gov/5123
//
// Writes src/data/eclipse-path-<yyyy-mm-dd>.json. Refuses to write if any of the
// reference cities below is on the wrong side of the outline.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const A = createRequire(import.meta.url)("astronomy-engine");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const EVENT_ID = "demo-eclipse-2024-04-08";
// The band really runs from the Pacific to the Atlantic; this range keeps the part
// around the United States (a little of Mexico and New Brunswick at the ends).
const LON_FROM = -104;
const LON_TO = -64;
const LON_STEP = 0.25;
/** Latitude scan step; smaller than the band's narrowest north-south width (~1.6°). */
const LAT_SCAN_STEP = 0.5;
const LAT_SCAN_FROM = 10;
const LAT_SCAN_TO = 65;
const BISECT_STEPS = 14; // 1° / 2^14 ≈ 0.007 km

// Where each city should fall. Sources: this file's own run vs. NASA's path map.
const CITIES = [
  ["Austin", 30.27, -97.74, true],
  ["Dallas", 32.78, -96.8, true],
  ["Indianapolis", 39.77, -86.16, true],
  ["Cleveland", 41.5, -81.69, true],
  ["Buffalo", 42.89, -78.88, true],
  ["Rochester", 43.16, -77.61, true],
  ["Burlington VT", 44.48, -73.21, true],
  ["Houlton ME", 46.13, -67.84, true],
  ["New York", 40.71, -74.0, false],
  ["Princeton", 40.35, -74.66, false],
  ["Atlanta", 33.75, -84.39, false],
  ["Chicago", 41.88, -87.63, false],
  ["Columbus", 39.96, -83.0, false],
  ["Cincinnati", 39.1, -84.51, false],
  ["Albany", 42.65, -73.76, false],
];

const demo = JSON.parse(readFileSync(resolve(root, "src/data/demo-events.json"), "utf8"));
const event = demo.find((e) => e.id === EVENT_ID);
if (!event) throw new Error(`no event ${EVENT_ID} in demo-events.json`);
const windowStart = Date.parse(event.windowStart);
const windowEnd = Date.parse(event.windowEnd);
const searchFrom = new Date(windowStart - 24 * 3600 * 1000);

function isTotal(lat, lon) {
  const info = A.SearchLocalSolarEclipse(searchFrom, new A.Observer(lat, lon, 0));
  const peak = info.peak.time.date.getTime();
  return info.kind === "total" && peak >= windowStart && peak <= windowEnd && info.peak.altitude > 0;
}

/** Edges [south, north] of the band on this meridian, or null if it isn't crossed. */
function bandAt(lon) {
  let lat = LAT_SCAN_FROM;
  while (lat <= LAT_SCAN_TO && !isTotal(lat, lon)) lat += LAT_SCAN_STEP;
  if (lat > LAT_SCAN_TO || lat === LAT_SCAN_FROM) return null;
  const firstTotal = lat;
  while (lat <= LAT_SCAN_TO && isTotal(lat, lon)) lat += LAT_SCAN_STEP;
  if (lat > LAT_SCAN_TO) return null;
  const firstOutside = lat;

  let lo = firstTotal - LAT_SCAN_STEP; // outside
  let hi = firstTotal; // total
  for (let i = 0; i < BISECT_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (isTotal(mid, lon)) hi = mid;
    else lo = mid;
  }
  const south = hi;

  lo = firstOutside - LAT_SCAN_STEP; // total
  hi = firstOutside; // outside
  for (let i = 0; i < BISECT_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (isTotal(mid, lon)) lo = mid;
    else hi = mid;
  }
  return [south, lo];
}

const round4 = (n) => Math.round(n * 1e4) / 1e4;
const southEdge = [];
const northEdge = [];
for (let lon = LON_FROM; lon <= LON_TO + 1e-9; lon += LON_STEP) {
  const band = bandAt(lon);
  if (!band) continue;
  southEdge.push([round4(lon), round4(band[0])]);
  northEdge.push([round4(lon), round4(band[1])]);
}
if (southEdge.length < 10) throw new Error("path not found; check the event window");
const ring = [...southEdge, ...northEdge.reverse(), southEdge[0]];

/** Ray casting; ring is [lon, lat] pairs. */
function inside(lat, lon) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

let wrong = 0;
for (const [name, lat, lon, expected] of CITIES) {
  const got = inside(lat, lon);
  if (got !== expected) wrong++;
  console.log(`${got === expected ? "ok   " : "WRONG"} ${name.padEnd(14)} ${got ? "inside" : "outside"}`);
}
console.log(`${ring.length} vertices, lon ${southEdge[0][0]} to ${southEdge.at(-1)[0]}`);
if (wrong > 0) {
  console.error(`${wrong} reference cities on the wrong side; not writing the file`);
  process.exit(1);
}

const day = event.windowStart.slice(0, 10);
const out = resolve(root, `src/data/eclipse-path-${day}.json`);
const feature = {
  type: "Feature",
  properties: { eventId: EVENT_ID, method: "astronomy-engine SearchLocalSolarEclipse, 0.25° longitude steps" },
  geometry: { type: "Polygon", coordinates: [ring] },
};
writeFileSync(out, JSON.stringify(feature) + "\n");
console.log(`wrote ${out}`);
