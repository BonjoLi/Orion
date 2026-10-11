"use client";

import { useEffect, useRef, useState } from "react";
import { Moon } from "@/components/landing/Moon";
import { OrionConstellation } from "@/components/landing/OrionConstellation";
import { SkyCanvas } from "@/components/landing/SkyCanvas";
import { Sun } from "@/components/landing/Sun";
import styles from "@/components/landing/sky.module.css";
import { useTheme } from "@/components/theme/theme";

// The whole sky behind the hero: gradients, moving stars/meteors/rockets, sun, moon and Orion.
// The dawn glow is the one thing React drives: it is re-created on every theme switch (never on
// first load), which restarts its CSS animation.
export function Sky() {
  const theme = useTheme();
  const previous = useRef(theme);
  const [switches, setSwitches] = useState(0);

  useEffect(() => {
    if (previous.current === theme) return;
    previous.current = theme;
    setSwitches((n) => n + 1);
  }, [theme]);

  return (
    <div className={styles.sky} aria-hidden="true">
      <div className={styles.night} />
      <div className={styles.day} />
      <OrionConstellation />
      <SkyCanvas />
      <div className={styles.moonX}>
        <div className={styles.moonY}>
          <Moon />
        </div>
      </div>
      <div className={styles.sunX}>
        <div className={styles.sunY}>
          <Sun />
        </div>
      </div>
      {switches > 0 && <div key={switches} className={styles.dawn} />}
    </div>
  );
}
