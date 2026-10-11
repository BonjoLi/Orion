import styles from "@/components/landing/sky.module.css";

// [x, y, radius] of each crater on the 120 x 120 disc.
const CRATERS: [number, number, number][] = [
  [40, 44, 9],
  [76, 66, 12],
  [52, 84, 6],
  [82, 38, 5],
  [64, 28, 3.5],
  [30, 72, 4],
  [92, 86, 3.5],
];

// Broad dark plains ("seas"), drawn under the craters.
const SEAS: [number, number, number, number][] = [
  [48, 56, 18, 12],
  [74, 48, 12, 9],
];

// The night moon: a gibbous disc with craters and a soft shadow side. Sets behind the limb when the theme goes light.
export function Moon() {
  return (
    <div className={styles.moon} aria-hidden="true">
      <svg viewBox="0 0 120 120" className={styles.moonSvg}>
        <defs>
          <radialGradient id="moonDisc" cx="36%" cy="32%" r="78%">
            <stop offset="0" stopColor="#fbfcff" />
            <stop offset="0.6" stopColor="#cdd5e4" />
            <stop offset="1" stopColor="#8d98ae" />
          </radialGradient>
          <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0.55" stopColor="#cfdcff" stopOpacity="0.32" />
            <stop offset="1" stopColor="#cfdcff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moonSea" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#6f7a90" stopOpacity="0.5" />
            <stop offset="1" stopColor="#6f7a90" stopOpacity="0" />
          </radialGradient>
          <clipPath id="moonClip">
            <circle cx="60" cy="60" r="44" />
          </clipPath>
        </defs>
        <circle cx="60" cy="60" r="60" fill="url(#moonHalo)" />
        <circle cx="60" cy="60" r="44" fill="url(#moonDisc)" />
        <g clipPath="url(#moonClip)">
          {SEAS.map(([x, y, rx, ry]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} fill="url(#moonSea)" />
          ))}
          {CRATERS.map(([x, y, r]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r={r} fill="#7b869b" opacity="0.42" />
              <circle cx={x - r * 0.18} cy={y - r * 0.18} r={r * 0.82} fill="#a4aec1" opacity="0.5" />
            </g>
          ))}
          <circle cx="86" cy="72" r="46" fill="#1a2440" opacity="0.38" />
        </g>
      </svg>
    </div>
  );
}
