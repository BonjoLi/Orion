"use client";

import { usePathname } from "next/navigation";
import styles from "@/components/theme/ThemeToggle.module.css";
import { setTheme, useTheme } from "@/components/theme/theme";

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" {...ICON}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" {...ICON}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />
    </svg>
  );
}

// Light/dark switch, fixed bottom-right on every page. The landing page plays a sunrise or
// sunset when it flips (all in CSS, keyed off <html data-theme>); the map just changes theme.
export function ThemeToggle() {
  const theme = useTheme();
  const light = theme === "light";
  const onMap = usePathname().startsWith("/map");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="Light mode"
      title={light ? "Switch to night" : "Switch to day"}
      className={`${styles.toggle} ${onMap ? styles.onMap : ""}`}
      onClick={() => setTheme(light ? "dark" : "light")}
    >
      <span className={styles.track} aria-hidden="true">
        <SunIcon />
        <MoonIcon />
        <span className={styles.knob}>{light ? <SunIcon /> : <MoonIcon />}</span>
      </span>
    </button>
  );
}
