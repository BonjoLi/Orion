import Link from "next/link";
import { Horizon } from "@/components/landing/Horizon";
import { Sky } from "@/components/landing/Sky";
import { Starfield } from "@/components/landing/Starfield";
import styles from "@/components/landing/landing.module.css";

// LANDING PAGE — ported from the Flask landing page (Orion/landing/templates/index.html).
// Keep the `href="/map"` CTA so the map stays one click away.
export default function LandingPage() {
  return (
    <div className={styles.page}>
      <Starfield />
      <h1 className={styles.title}>Welcome, Stargazer</h1>

      <main className={styles.hero}>
        <div className={styles.wordmark}>ORION</div>
        <Link className={styles.cta} href="/map">
          <svg className={styles["ico-star"]} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 1.4 14.4 8.6 21.6 11 14.4 13.4 12 20.6 9.6 13.4 2.4 11 9.6 8.6Z" />
          </svg>
          Get Started
        </Link>
      </main>

      <Sky />
      <Horizon />
    </div>
  );
}
