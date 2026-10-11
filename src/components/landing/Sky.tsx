import styles from "@/components/landing/landing.module.css";

// Constellation + moon, ported from the Flask landing page.
const STARS = [
  [26, 40, 2.6],
  [18, 92, 2.3],
  [96, 86, 2.4],
  [86, 34, 2.2],
  [146, 108, 2.3],
  [198, 74, 2.6],
  [246, 40, 2.1],
] as const;

export function Sky() {
  return (
    <div className={styles.sky} aria-hidden="true">
      <svg className={styles.constellation} viewBox="0 0 300 160">
        <g fill="none" stroke="#a9c6ff" strokeOpacity=".35" strokeWidth="1">
          <path d="M26 40 18 92 96 86 86 34ZM96 86 146 108 198 74 246 40" />
        </g>
        <g fill="#eaf2ff">
          {STARS.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      </svg>

      <div className={styles.moon}>
        <svg viewBox="0 0 120 120">
          <defs>
            <radialGradient id="moonGrad" cx="35%" cy="30%">
              <stop offset="0" stopColor="#f4f6fb" />
              <stop offset="1" stopColor="#9aa4b5" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="48" fill="url(#moonGrad)" />
          <circle cx="42" cy="46" r="9" fill="#7e8797" opacity=".5" />
          <circle cx="78" cy="68" r="12" fill="#7e8797" opacity=".45" />
          <circle cx="52" cy="82" r="6" fill="#7e8797" opacity=".5" />
          <circle cx="82" cy="40" r="5" fill="#7e8797" opacity=".4" />
        </svg>
      </div>
    </div>
  );
}
