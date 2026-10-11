// Scene model for the animated landing sky. Everything on screen is a pure function of time:
// stars drift and twinkle from their seed values, meteors and rockets are stored with the
// moment they start and positioned from that. `advance` only decides what to add or drop.

export type Star = {
  x: number;
  y: number;
  r: number;
  alpha: number;
  twinkleHz: number;
  phase: number;
  driftPx: number;
  tint: string;
  flare: boolean;
};
export type Meteor = { start: number; x: number; y: number; vx: number; vy: number; length: number; life: number };
export type Rocket = { start: number; x: number; y: number; heading: number; turn: number; speed: number; size: number };
export type Scene = {
  width: number;
  height: number;
  stars: Star[];
  meteors: Meteor[];
  rockets: Rocket[];
  nextShower: number;
  nextSporadic: number;
  nextRocket: number;
};

// All timing and density numbers below are art direction, tuned by eye.
const FIRST_SHOWER_S = 3.5;
const SHOWER_GAP_S: [number, number] = [16, 28];
const SPORADIC_GAP_S: [number, number] = [5, 9];
const FIRST_ROCKET_S = 8;
const ROCKET_GAP_S: [number, number] = [24, 40];
const DAY_ROCKET_HOLD_S = 6; // after the sky turns to day, the next rocket waits at least this long once night returns
const ROCKET_TRAIL_S = 2.4;
const TRAIL_STEP_S = 0.06;

const TINTS = ["#c9d5e8", "#c9d5e8", "#c9d5e8", "#ffe2b8", "#b9d4ff"];

const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const range = ([lo, hi]: [number, number]) => between(lo, hi);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Three depth layers: many faint far stars, fewer mid, a handful of bright near stars that flare. */
function makeStars(width: number, height: number): Star[] {
  const total = Math.round(Math.min(420, Math.max(160, (width * height) / 5200)));
  return Array.from({ length: total }, (_, i) => {
    const depth = i < total * 0.66 ? 0 : i < total * 0.93 ? 1 : 2;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: [between(0.3, 0.65), between(0.6, 1.0), between(1.0, 1.5)][depth],
      alpha: [between(0.25, 0.55), between(0.4, 0.8), between(0.7, 1)][depth],
      twinkleHz: [between(0.15, 0.4), between(0.25, 0.7), between(0.3, 0.9)][depth],
      phase: Math.random() * Math.PI * 2,
      driftPx: [0.5, 1.3, 2.8][depth],
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      flare: depth === 2,
    };
  });
}

export function createScene(width: number, height: number): Scene {
  return {
    width,
    height,
    stars: makeStars(width, height),
    meteors: [],
    rockets: [],
    nextShower: FIRST_SHOWER_S,
    nextSporadic: FIRST_SHOWER_S + range(SPORADIC_GAP_S),
    nextRocket: FIRST_ROCKET_S,
  };
}

/** One meteor streaking away from a radiant point, so a burst reads as one shower. */
function meteorFrom(radiant: { x: number; y: number }, start: number, spread: number): Meteor {
  const angle = Math.PI / 2 + between(-spread, spread) + (radiant.x > 0 ? 0.35 : -0.35);
  const speed = between(650, 1100);
  const offset = between(30, 190);
  return {
    start,
    x: radiant.x + Math.cos(angle) * offset,
    y: radiant.y + Math.sin(angle) * offset,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: between(90, 230),
    life: between(0.7, 1.3),
  };
}

function shower(scene: Scene, now: number): Meteor[] {
  const radiant = { x: between(0.25, 0.75) * scene.width, y: between(-0.1, 0.12) * scene.height };
  const count = 6 + Math.floor(Math.random() * 7);
  return Array.from({ length: count }, () => meteorFrom(radiant, now + Math.random() * 2.6, 0.85));
}

function rocketLaunch(scene: Scene, now: number): Rocket {
  const side = Math.random() < 0.5 ? -1 : 1;
  return {
    start: now,
    x: between(0.14, 0.86) * scene.width,
    y: scene.height * 0.78, // behind the Earth limb, so it rises out of the planet
    heading: -Math.PI / 2 + side * between(0.1, 0.5),
    turn: side * between(0.03, 0.09),
    speed: scene.height * between(0.085, 0.115),
    size: Math.min(1.25, Math.max(0.75, scene.width / 1300)),
  };
}

/**
 * Adds due meteors/rockets, drops finished ones. `mix` is 0 at night, 1 by day. Meteors and
 * rockets are night-only: by day the timers are held back so nothing fires the moment night returns.
 */
export function advance(scene: Scene, now: number, mix: number): Scene {
  const dayTime = mix > 0.5;
  const showerDue = now >= scene.nextShower;
  const sporadicDue = now >= scene.nextSporadic;
  const rocketDue = now >= scene.nextRocket;

  const fresh = [
    ...(showerDue && !dayTime ? shower(scene, now) : []),
    ...(sporadicDue && !dayTime ? [meteorFrom({ x: between(0.1, 0.9) * scene.width, y: -20 }, now, 0.5)] : []),
  ];
  const meteors = [...scene.meteors.filter((m) => now - m.start < m.life), ...fresh];
  const launched = rocketDue && !dayTime;
  const rockets = [
    ...scene.rockets.filter((r) => now - r.start < 16),
    ...(launched ? [rocketLaunch(scene, now)] : []),
  ];

  return {
    ...scene,
    meteors,
    rockets,
    nextShower: showerDue ? now + range(SHOWER_GAP_S) : scene.nextShower,
    nextSporadic: sporadicDue ? now + range(SPORADIC_GAP_S) : scene.nextSporadic,
    nextRocket: dayTime
      ? Math.max(scene.nextRocket, now + DAY_ROCKET_HOLD_S)
      : rocketDue
        ? now + range(ROCKET_GAP_S)
        : scene.nextRocket,
  };
}

// ---------------------------------------------------------------------------- drawing

export type Pose = { x: number; y: number; angle: number };

/** Where a rocket is `age` seconds after launch: a steady gravity-turn arc. */
export function rocketPose(rocket: Rocket, age: number): Pose {
  const { x, y, heading, turn, speed } = rocket;
  const angle = heading + turn * age;
  return {
    x: x + (speed / turn) * (Math.sin(angle) - Math.sin(heading)),
    y: y - (speed / turn) * (Math.cos(angle) - Math.cos(heading)),
    angle,
  };
}

function drawStars(ctx: CanvasRenderingContext2D, scene: Scene, now: number, visibility: number, still: boolean) {
  for (const s of scene.stars) {
    const wave = Math.sin(now * s.twinkleHz * Math.PI * 2 + s.phase);
    const twinkle = still ? 1 : 0.7 + 0.3 * wave;
    // near stars also flash: a short bright spike on top of the slow twinkle
    const flash = s.flare && !still ? Math.pow(Math.max(0, wave), 14) : 0;
    const alpha = Math.min(1, s.alpha * twinkle + flash * 0.6) * visibility;
    if (alpha < 0.02) continue;
    const x = (((s.x + (still ? 0 : now * s.driftPx)) % scene.width) + scene.width) % scene.width;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.tint;
    ctx.beginPath();
    ctx.arc(x, s.y, s.r * (1 + flash * 0.5), 0, Math.PI * 2);
    ctx.fill();
    if (flash > 0.05) {
      ctx.globalAlpha = alpha * flash;
      ctx.strokeStyle = s.tint;
      ctx.lineWidth = 0.8;
      const arm = s.r * 7 * flash;
      ctx.beginPath();
      ctx.moveTo(x - arm, s.y);
      ctx.lineTo(x + arm, s.y);
      ctx.moveTo(x, s.y - arm);
      ctx.lineTo(x, s.y + arm);
      ctx.stroke();
    }
  }
}

function drawMeteors(ctx: CanvasRenderingContext2D, scene: Scene, now: number, visibility: number) {
  ctx.lineCap = "round";
  for (const m of scene.meteors) {
    const age = now - m.start;
    if (age < 0 || age > m.life) continue;
    const progress = age / m.life;
    const strength = Math.sin(Math.PI * Math.min(1, progress * 1.15)) * visibility;
    const hx = m.x + m.vx * age;
    const hy = m.y + m.vy * age;
    const speed = Math.hypot(m.vx, m.vy);
    const tail = m.length * (0.35 + 0.65 * Math.min(1, progress * 3));
    const tx = hx - (m.vx / speed) * tail;
    const ty = hy - (m.vy / speed) * tail;
    const gradient = ctx.createLinearGradient(hx, hy, tx, ty);
    gradient.addColorStop(0, `rgba(255,255,255,${strength})`);
    gradient.addColorStop(0.25, `rgba(190,215,255,${strength * 0.55})`);
    gradient.addColorStop(1, "rgba(150,190,255,0)");
    ctx.globalAlpha = 1;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${strength})`;
    ctx.beginPath();
    ctx.arc(hx, hy, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRocketBody(ctx: CanvasRenderingContext2D, pose: Pose, size: number, now: number, alpha: number) {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.scale(size, size);
  ctx.globalAlpha = alpha;

  const flicker = 9 + 5 * Math.sin(now * 38) + 3 * Math.sin(now * 61);
  const flame = ctx.createLinearGradient(-14, 0, -14 - flicker - 6, 0);
  flame.addColorStop(0, "rgba(255,244,190,0.95)");
  flame.addColorStop(0.45, "rgba(255,150,60,0.8)");
  flame.addColorStop(1, "rgba(255,90,40,0)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-14, -3.2);
  ctx.lineTo(-14 - flicker - 6, 0);
  ctx.lineTo(-14, 3.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c8d3ea"; // fins
  ctx.beginPath();
  ctx.moveTo(-14, -5);
  ctx.lineTo(-21, -11.5);
  ctx.lineTo(-5, -5);
  ctx.moveTo(-14, 5);
  ctx.lineTo(-21, 11.5);
  ctx.lineTo(-5, 5);
  ctx.fill();

  ctx.fillStyle = "#f2f6ff"; // fuselage
  ctx.beginPath();
  ctx.moveTo(-14, -5);
  ctx.lineTo(5, -5);
  ctx.quadraticCurveTo(18, 0, 5, 5);
  ctx.lineTo(-14, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff6f4d"; // nose cone
  ctx.beginPath();
  ctx.moveTo(4, -5);
  ctx.quadraticCurveTo(18, 0, 4, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#4aa8e8"; // porthole
  ctx.beginPath();
  ctx.arc(-3, 0, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Exhaust: puffs sampled along the rocket's own earlier path, so no trail state is stored.
 * `visibility` is the night amount, so a rocket in flight fades out with the stars when day comes.
 */
function drawRocket(ctx: CanvasRenderingContext2D, rocket: Rocket, now: number, visibility: number) {
  const age = now - rocket.start;
  ctx.fillStyle = "rgb(150,190,255)"; // pale blue exhaust glow
  for (let back = ROCKET_TRAIL_S; back > 0; back -= TRAIL_STEP_S) {
    if (age - back < 0) continue;
    const puff = rocketPose(rocket, age - back);
    const fade = 1 - back / ROCKET_TRAIL_S;
    ctx.globalAlpha = fade * fade * 0.42 * visibility;
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, (2 + (1 - fade) * 8) * rocket.size, 0, Math.PI * 2);
    ctx.fill();
  }
  drawRocketBody(ctx, rocketPose(rocket, age), rocket.size, now, visibility);
}

/** `mix`: 0 = night, 1 = day. `still` draws one calm frame for reduced-motion visitors. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, now: number, mix: number, still = false) {
  ctx.clearRect(0, 0, scene.width, scene.height);
  const night = 1 - mix;
  if (night > 0.01) {
    drawStars(ctx, scene, now, night, still);
    drawMeteors(ctx, scene, now, night);
    if (!still) for (const rocket of scene.rockets) drawRocket(ctx, rocket, now, night);
  }
  ctx.globalAlpha = 1;
}
