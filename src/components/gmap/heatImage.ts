import { HEAT_COLORS } from "@/components/gmap/contracts";
import type { Bounds, LatLon, ScorePoint } from "@/lib/types";

// Paints the scored grid into one smooth image for the map overlay. Scores sit on
// a ~25 km lattice (the weather model's own resolution), so the image blends
// between lattice points (bilinear) instead of drawing blocks.

const WIDTH_PX = 512; // tunable
const MAX_HEIGHT_PX = 1024;
/** Share of the radius over which the circular edge fades out. */ // tunable
const EDGE_FADE = 0.12;
const KM_PER_DEG = 111.32;

export type HeatInput = {
  points: ScorePoint[];
  /** Lattice edges: point (i, j) sits at south + i·step, west + j·step. */
  bounds: Bounds;
  step: number;
  /** The searched place and the radius around it that is shown. */
  center: LatLon;
  radiusKm: number;
  /**
   * Outline the colours are cut to (e.g. the eclipse's path of totality). Smoothing
   * would otherwise bleed colour a few km past the edge, outside where the event is visible.
   */
  clip?: { lat: number; lng: number }[];
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const mercY = (latDeg: number) => Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
const mercLat = (y: number) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

/** RGBA for each whole score 0–100, interpolated along HEAT_COLORS. Built once. */
let lut: Uint8ClampedArray | undefined;
function palette(): Uint8ClampedArray {
  if (lut) return lut;
  const out = new Uint8ClampedArray(101 * 4);
  const last = HEAT_COLORS.length - 1;
  for (let s = 0; s <= 100; s++) {
    const t = (s / 100) * last;
    const k = Math.min(Math.floor(t), last - 1);
    const f = t - k;
    const [r0, g0, b0, a0] = HEAT_COLORS[k];
    const [r1, g1, b1, a1] = HEAT_COLORS[k + 1];
    out.set([r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f, (a0 + (a1 - a0) * f) * 255], s * 4);
  }
  return (lut = out);
}

/** Bilinear value at fractional lattice position (gi, gj); lattice holes are skipped. NaN if none. */
function sample(v: Float32Array, rows: number, cols: number, gi: number, gj: number): number {
  const i0 = Math.floor(gi);
  const j0 = Math.floor(gj);
  const fi = gi - i0;
  const fj = gj - j0;
  let sum = 0;
  let weight = 0;
  for (let k = 0; k < 4; k++) {
    const di = k >> 1;
    const dj = k & 1;
    const i = i0 + di;
    const j = j0 + dj;
    if (i < 0 || i >= rows || j < 0 || j >= cols) continue;
    const value = v[i * cols + j];
    if (Number.isNaN(value)) continue;
    const w = (di ? fi : 1 - fi) * (dj ? fj : 1 - fj);
    sum += value * w;
    weight += w;
  }
  return weight > 0 ? sum / weight : NaN;
}

/** PNG data URL covering `bounds`, or null if there is no canvas or too few points. */
export function renderHeatImage({ points, bounds, step, center, radiusKm, clip }: HeatInput): string | null {
  const { north, south, east, west } = bounds;
  const rows = Math.round((north - south) / step) + 1;
  const cols = Math.round((east - west) / step) + 1;
  if (rows < 2 || cols < 2 || points.length === 0) return null;

  const values = new Float32Array(rows * cols).fill(NaN);
  for (const p of points) {
    const i = Math.round((p.lat - south) / step);
    const j = Math.round((p.lon - west) / step);
    if (i >= 0 && i < rows && j >= 0 && j < cols) values[i * cols + j] = p.score;
  }

  // Image rows are evenly spaced in Web Mercator y, which is how Google stretches the overlay.
  const yNorth = mercY(north);
  const ySouth = mercY(south);
  const height = Math.min(MAX_HEIGHT_PX, Math.max(2, Math.round((WIDTH_PX * (yNorth - ySouth)) / (((east - west) * Math.PI) / 180))));
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH_PX;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(WIDTH_PX, height);
  const colors = palette();
  const kmPerLon = KM_PER_DEG * Math.cos((center.lat * Math.PI) / 180);
  for (let r = 0; r < height; r++) {
    const lat = mercLat(yNorth + ((ySouth - yNorth) * (r + 0.5)) / height);
    const gi = (lat - south) / step;
    for (let c = 0; c < WIDTH_PX; c++) {
      const lon = west + ((east - west) * (c + 0.5)) / WIDTH_PX;
      const score = sample(values, rows, cols, gi, (lon - west) / step);
      if (Number.isNaN(score)) continue; // stays transparent
      const km = Math.hypot((lon - center.lon) * kmPerLon, (lat - center.lat) * KM_PER_DEG);
      const fade = clamp01((radiusKm - km) / (radiusKm * EDGE_FADE));
      if (fade === 0) continue;
      const k = Math.round(Math.max(0, Math.min(100, score))) * 4;
      const o = (r * WIDTH_PX + c) * 4;
      image.data[o] = colors[k];
      image.data[o + 1] = colors[k + 1];
      image.data[o + 2] = colors[k + 2];
      image.data[o + 3] = colors[k + 3] * fade;
    }
  }
  ctx.putImageData(image, 0, 0);
  if (clip) {
    // Keep only the pixels inside the outline (same Mercator row spacing as above).
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    clip.forEach((p, i) => {
      const x = ((p.lng - west) / (east - west)) * WIDTH_PX;
      const y = ((mercY(p.lat) - yNorth) / (ySouth - yNorth)) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.fill();
  }
  return canvas.toDataURL("image/png");
}
