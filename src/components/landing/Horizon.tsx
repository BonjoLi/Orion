import { EarthGlobe } from "@/components/landing/EarthGlobe";
import styles from "@/components/landing/horizon.module.css";

// Planet limb at the bottom of the landing page. EarthGlobe draws the real planet; the CSS
// night/day surfaces underneath are the fallback (no WebGL2, texture still loading), and
// they cross-fade when <html data-theme> changes.
export function Horizon() {
  return (
    <div className={styles.horizon} aria-hidden="true">
      <div className={`${styles.earth} ${styles.night}`} />
      <div className={`${styles.earth} ${styles.day}`} />
      <EarthGlobe />
      <div className={styles.ground} />
      <div className={`${styles.glow} ${styles.glowNight}`} />
      <div className={`${styles.glow} ${styles.glowDay}`} />
    </div>
  );
}
