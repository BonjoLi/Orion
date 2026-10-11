"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/landing/landing.module.css";

// Static starfield, drawn once per resize (no animation).
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    function draw() {
      if (!canvas || !ctx) return;
      const dpr = devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const count = Math.min(220, Math.floor((innerWidth * innerHeight) / 6000));
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.15 + Math.random() * 0.6;
        ctx.fillStyle = "#c9d5e8";
        ctx.beginPath();
        ctx.arc(Math.random() * innerWidth, Math.random() * innerHeight, Math.random() * 1.1 + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    draw();
    addEventListener("resize", draw);
    return () => removeEventListener("resize", draw);
  }, []);

  return <canvas ref={ref} className={styles.stars} aria-hidden="true" />;
}
