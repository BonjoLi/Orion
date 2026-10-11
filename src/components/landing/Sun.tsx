import styles from "@/components/landing/sky.module.css";

const TAU = Math.PI * 2;
const C = 160; // centre of the 320 x 320 viewBox
const DISC_R = 50;

const point = (angle: number, radius: number) => `${(C + Math.cos(angle) * radius).toFixed(1)} ${(C + Math.sin(angle) * radius).toFixed(1)}`;

/** Tapered triangular rays. Every other ray is shorter, so the ring reads as a corona, not a gear. */
function rays(count: number, inner: number, outer: number, halfWidth: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * TAU + offset;
    const tip = i % 2 === 0 ? outer : outer * 0.8;
    return `M${point(angle - halfWidth, inner)}L${point(angle, tip)}L${point(angle + halfWidth, inner)}Z`;
  }).join("");
}

const BROAD_RAYS = rays(18, DISC_R - 4, 146, 0.1);
const FINE_RAYS = rays(30, DISC_R + 2, 118, 0.035, TAU / 60);

// Darker patches on the disc. The group turns, so the surface visibly rotates under the corona.
const SPOTS: [number, number, number, number][] = [
  [-20, -12, 9, 5],
  [14, -22, 6, 4],
  [22, 10, 11, 6],
  [-8, 24, 7, 4],
  [-30, 12, 5, 3],
];

// The daytime sun: a calm, slowly turning corona around a glowing disc. Rises over the limb when the theme goes light.
export function Sun() {
  return (
    <div className={styles.sun} aria-hidden="true">
      <svg viewBox="0 0 320 320" className={styles.sunSvg}>
        <defs>
          <radialGradient id="sunHalo" cx={C} cy={C} r={C} gradientUnits="userSpaceOnUse">
            <stop offset="0.22" stopColor="#ffd98a" stopOpacity="0.7" />
            <stop offset="0.55" stopColor="#ffb55a" stopOpacity="0.2" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sunRay" cx={C} cy={C} r="150" gradientUnits="userSpaceOnUse">
            <stop offset="0.3" stopColor="#fff0b8" stopOpacity="0.95" />
            <stop offset="0.7" stopColor="#ffc457" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sunDisc" cx="42%" cy="38%" r="70%">
            <stop offset="0" stopColor="#fffbe6" />
            <stop offset="0.5" stopColor="#ffd45a" />
            <stop offset="1" stopColor="#f59a1b" />
          </radialGradient>
          <radialGradient id="sunSpot" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#b85a0a" stopOpacity="0.4" />
            <stop offset="1" stopColor="#b85a0a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="sunClip">
            <circle cx={C} cy={C} r={DISC_R} />
          </clipPath>
        </defs>

        <circle cx={C} cy={C} r={C} fill="url(#sunHalo)" />
        <path className={styles.raysSlow} d={BROAD_RAYS} fill="url(#sunRay)" />
        <path className={styles.raysFast} d={FINE_RAYS} fill="url(#sunRay)" opacity="0.7" />
        <circle cx={C} cy={C} r={DISC_R + 6} fill="#ffe7a0" opacity="0.28" />
        <circle cx={C} cy={C} r={DISC_R} fill="url(#sunDisc)" />
        <g clipPath="url(#sunClip)">
          <g className={styles.sunSurface}>
            {SPOTS.map(([dx, dy, rx, ry]) => (
              <ellipse key={`${dx}-${dy}`} cx={C + dx} cy={C + dy} rx={rx} ry={ry} fill="url(#sunSpot)" />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
