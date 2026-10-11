"use client";

import { useEffect, useRef } from "react";
import { EARTH_FRAG, EARTH_VERT } from "@/components/landing/earthShader";
import styles from "@/components/landing/horizon.module.css";
import { createProgram, loadTexture } from "@/components/landing/webgl";

// The planet is a real sphere drawn from NASA imagery. Its geometry matches the old CSS Earth:
// the top of the limb sits LIMB_VH from the bottom of the screen, on a circle EARTH_VW wide.
const LIMB_VH = 0.3;
const EARTH_VW = 2.8;
const EARTH_VH = 3.2;
const CANVAS_VH = 0.4; // only the bottom 40% of the screen ever shows the planet
const MAX_DPR = 1.5;
const FRAME_MS = 1000 / 30;
const FADE_TAU_S = 0.75; // same easing as the sky, so the terminator sweeps in step with the sunrise

const DEG = Math.PI / 180;
const LON_START = -78 * DEG; // the US east coast faces us: the demo event is the 2024 US eclipse
const LAT_VIEW = -40 * DEG; // seen from the south, so the visible rim shows ~20-50 degrees north
const SPIN_RAD_PER_S = 0.5 * DEG; // one turn in about twelve minutes
const CLOUD_EXTRA_RAD_PER_S = 0.15 * DEG;

// Direction to the sun, in view space (x right, y up, z toward the viewer).
const SUN_NIGHT: [number, number, number] = [-0.3, 0.1, -0.95]; // just set, behind the planet
const SUN_DAY: [number, number, number] = [0.3, 0.52, 0.8]; // over the limb, lighting the near side

const mixSun = (day: number): [number, number, number] => {
  const v = SUN_NIGHT.map((n, i) => n + (SUN_DAY[i] - n) * day);
  const length = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
};

// Draws the globe over the CSS planet. If WebGL2 or a texture is missing, nothing changes: the
// CSS planet underneath keeps showing. Once the first frame is drawn the parent is marked
// data-globe="on" so CSS can fade the fallback out.
export function EarthGlobe() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!canvas || !gl) return;

    const root = document.documentElement;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const targetDay = () => (root.dataset.theme === "light" ? 1 : 0);

    let disposed = false;
    let frame = 0;
    let last = 0;
    let clock = 0;
    let day = targetDay();
    let program: WebGLProgram | null = null;
    let uniform: Record<string, WebGLUniformLocation | null> = {};

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * CANVAS_VH * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function draw() {
      if (!canvas || !gl || !program) return;
      const dpr = canvas.width / innerWidth;
      const radius = (Math.max(EARTH_VW * innerWidth, EARTH_VH * innerHeight) / 2) * dpr;
      const apexY = innerHeight * (1 - LIMB_VH - (1 - CANVAS_VH)) * dpr; // limb apex, from the canvas top
      gl.uniform2f(uniform.uRes, canvas.width, canvas.height);
      gl.uniform2f(uniform.uCenter, canvas.width / 2, apexY + radius);
      gl.uniform1f(uniform.uRadius, radius);
      gl.uniform1f(uniform.uLon, LON_START - clock * SPIN_RAD_PER_S);
      gl.uniform1f(uniform.uCloudLon, LON_START - clock * (SPIN_RAD_PER_S + CLOUD_EXTRA_RAD_PER_S));
      gl.uniform1f(uniform.uLat, LAT_VIEW);
      gl.uniform3fv(uniform.uSun, mixSun(day));
      gl.uniform1f(uniform.uTime, clock);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick(timestamp: number) {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      if (last && timestamp - last < FRAME_MS) return;
      const step = last ? Math.min(0.1, (timestamp - last) / 1000) : 0;
      last = timestamp;
      clock += step;
      day += (targetDay() - day) * (1 - Math.exp(-step / FADE_TAU_S));
      draw();
    }

    function start() {
      cancelAnimationFrame(frame);
      last = 0;
      if (reduceMotion.matches) {
        day = targetDay();
        draw();
      } else if (!document.hidden) {
        frame = requestAnimationFrame(tick);
      }
    }

    const onVisibility = () => (document.hidden ? cancelAnimationFrame(frame) : start());
    const onResize = () => {
      resize();
      if (reduceMotion.matches) draw();
    };
    const themeWatcher = new MutationObserver(() => {
      if (reduceMotion.matches) {
        day = targetDay();
        draw();
      }
    });

    async function init() {
      if (!gl) return;
      try {
        program = createProgram(gl, EARTH_VERT, EARTH_FRAG);
        gl.useProgram(program);
        await Promise.all([loadTexture(gl, "/earth/day.webp", 0), loadTexture(gl, "/earth/night.webp", 1)]);
        if (disposed) return;
        for (const name of ["uRes", "uCenter", "uRadius", "uLon", "uLat", "uCloudLon", "uSun", "uTime"]) {
          uniform = { ...uniform, [name]: gl.getUniformLocation(program, name) };
        }
        gl.uniform1i(gl.getUniformLocation(program, "uDayTex"), 0);
        gl.uniform1i(gl.getUniformLocation(program, "uNightTex"), 1);
        resize();
        start();
        draw();
        canvas?.parentElement?.setAttribute("data-globe", "on");
      } catch {
        // Missing texture or a GPU that can't run the shader: the CSS planet stays.
        program = null;
      }
    }

    const onContextLost = (event: Event) => {
      event.preventDefault();
      disposed = true;
      cancelAnimationFrame(frame);
      canvas?.parentElement?.removeAttribute("data-globe");
    };

    canvas.addEventListener("webglcontextlost", onContextLost);
    themeWatcher.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", start);
    void init();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      themeWatcher.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", start);
    };
  }, []);

  return <canvas ref={ref} className={styles.globe} aria-hidden="true" />;
}
