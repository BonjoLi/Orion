import styles from "@/components/landing/sky.module.css";

// The real constellation, in a 300 x 240 box: shoulders, belt, feet and sword.
type Star = { id: string; x: number; y: number; r: number; tint: string };

const STARS: Star[] = [
  { id: "meissa", x: 150, y: 22, r: 2, tint: "#eaf2ff" },
  { id: "betelgeuse", x: 88, y: 44, r: 4.4, tint: "#ffb27a" },
  { id: "bellatrix", x: 214, y: 52, r: 3.4, tint: "#d6e6ff" },
  { id: "alnitak", x: 122, y: 118, r: 3.1, tint: "#eaf2ff" },
  { id: "alnilam", x: 150, y: 112, r: 3.5, tint: "#eaf2ff" },
  { id: "mintaka", x: 178, y: 106, r: 3, tint: "#eaf2ff" },
  { id: "saiph", x: 104, y: 192, r: 2.6, tint: "#d6e6ff" },
  { id: "rigel", x: 222, y: 182, r: 4.2, tint: "#a9c8ff" },
  { id: "sword-top", x: 148, y: 148, r: 1.5, tint: "#eaf2ff" },
  { id: "sword-nebula", x: 150, y: 160, r: 2, tint: "#e3b8ff" },
  { id: "sword-tip", x: 152, y: 172, r: 1.5, tint: "#eaf2ff" },
];

const LINES = [
  "M150 22 88 44",
  "M150 22 214 52",
  "M88 44 122 118",
  "M214 52 178 106",
  "M122 118 150 112 178 106",
  "M122 118 104 192",
  "M178 106 222 182",
  "M150 112 148 148 150 160 152 172",
];

// Traces itself once on load (stroke-draw), then each star keeps its own slow twinkle.
export function OrionConstellation() {
  return (
    <svg className={styles.constellation} viewBox="0 0 300 240" aria-hidden="true">
      <defs>
        <radialGradient id="starHalo">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" stroke="#a9c6ff" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {LINES.map((d, i) => (
          <path key={d} d={d} pathLength={1} className={styles.line} style={{ animationDelay: `${0.4 + i * 0.22}s` }} />
        ))}
      </g>
      {STARS.map((s, i) => (
        <g key={s.id} className={styles.cstar} style={{ animationDelay: `${(i * 0.7) % 4}s`, animationDuration: `${3.2 + (i % 4) * 0.9}s` }}>
          <circle cx={s.x} cy={s.y} r={s.r * 3.4} fill="url(#starHalo)" />
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.tint} />
        </g>
      ))}
    </svg>
  );
}
