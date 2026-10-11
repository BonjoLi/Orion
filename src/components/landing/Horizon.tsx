import styles from "@/components/landing/landing.module.css";

// Planet limb at the bottom of the landing page.
export function Horizon() {
  return (
    <div className={styles.horizon} aria-hidden="true">
      <div className={styles.earth} />
      <div className={styles.ground} />
      <div className={styles.atmo} />
    </div>
  );
}
