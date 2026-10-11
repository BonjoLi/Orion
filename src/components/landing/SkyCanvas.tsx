"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/landing/landing.module.css";
import { advance, createScene, drawScene } from "@/components/landing/skyScene";

const MAX_DPR = 2;
const MAX_STEP_S = 0.05; // a long frame (slow tab, breakpoint) must not teleport anything
const FADE_TAU_S = 0.75; // stars fade with the sky: roughly settled after ~2.5 s

// One canvas, one requestAnimationFrame loop for stars, meteors and rockets. It follows
// <html data-theme> itself, so React never re-renders while it animates.
export function SkyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const root = document.documentElement;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const targetMix = () => (root.dataset.theme === "light" ? 1 : 0);

    let scene = createScene(innerWidth, innerHeight);
    let mix = targetMix();
    let clock = 0;
    let last = 0;
    let frame = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene = createScene(innerWidth, innerHeight);
      if (reduceMotion.matches) paintStill();
    }

    function paintStill() {
      if (!ctx) return;
      mix = targetMix();
      drawScene(ctx, scene, 0, mix, true);
    }

    function tick(timestamp: number) {
      if (!ctx) return;
      const step = last ? Math.min(MAX_STEP_S, (timestamp - last) / 1000) : 0;
      last = timestamp;
      clock += step;
      mix += (targetMix() - mix) * (1 - Math.exp(-step / FADE_TAU_S));
      scene = advance(scene, clock, mix);
      drawScene(ctx, scene, clock, mix);
      frame = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(frame);
      last = 0;
      if (reduceMotion.matches) {
        paintStill();
      } else if (!document.hidden) {
        frame = requestAnimationFrame(tick);
      }
    }

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    }

    // Reduced motion has no loop, so a theme change repaints the still sky directly.
    const themeWatcher = new MutationObserver(() => {
      if (reduceMotion.matches) paintStill();
    });
    themeWatcher.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    start();
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(frame);
      themeWatcher.disconnect();
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", start);
    };
  }, []);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
