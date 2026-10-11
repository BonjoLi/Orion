import Link from "next/link";
import { Horizon } from "@/components/landing/Horizon";
import { Sky } from "@/components/landing/Sky";
import styles from "@/components/landing/landing.module.css";

// LANDING PAGE. Keep the `href="/map"` CTA so the map stays one click away.
// The description line is the site description from layout.tsx, reused as-is.
export default function LandingPage() {
  return (
    <div className={styles.page}>
      <Sky />

      <main className={styles.hero}>
        <h1 className={styles.wordmark}>ORION</h1>
        <svg className={styles.belt} viewBox="0 0 46 14" aria-hidden="true">
          <circle cx="7" cy="11" r="2.2" />
          <circle cx="23" cy="7" r="2.6" />
          <circle cx="39" cy="3" r="2.1" />
        </svg>
        <p className={styles.greeting}>Welcome, Stargazer</p>
        <p className={styles.lede}>
          Pick a sky event. See where within reach the sky will be clear and dark, hour by hour.
        </p>
        <Link className={styles.cta} href="/map">
          <svg className={styles.star} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 1.4 14.4 8.6 21.6 11 14.4 13.4 12 20.6 9.6 13.4 2.4 11 9.6 8.6Z" />
          </svg>
          Get Started
        </Link>
      </main>

      <Horizon />
    </div>
  );
}
