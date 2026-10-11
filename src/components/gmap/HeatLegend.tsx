import { HEAT_COLORS } from "@/components/gmap/contracts";

// CSS gradient from the same stops the overlay is painted with. A dark backing keeps
// the transparent end of the palette visible as "nothing here".
const GRADIENT = `linear-gradient(to right, ${HEAT_COLORS.map(
  ([r, g, b, a], i) => `rgba(${r},${g},${b},${a}) ${Math.round((i / (HEAT_COLORS.length - 1)) * 100)}%`,
).join(", ")})`;

type Props = {
  /** Show the colour scale (the heatmap is drawn). */
  showHeat?: boolean;
  /** Show the blue "path of totality" key (an event path is drawn). */
  showPath?: boolean;
  caption?: string;
};

/** Bottom-left key. Higher is better for the heatmap, unlike light-pollution maps. */
export function HeatLegend({ showHeat = false, showPath = false, caption }: Props) {
  return (
    <div
      role="img"
      aria-label="Map legend"
      className="pointer-events-none absolute bottom-8 left-3 z-20 w-48 rounded-lg border border-white/15 bg-[var(--panel)] px-3 py-2 text-xs text-[var(--ink)]"
    >
      {showPath && (
        <div className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm border border-blue-400 bg-blue-900/70" aria-hidden="true" />
          <span>Path of totality</span>
        </div>
      )}
      {showHeat && (
        <div className={showPath ? "mt-2" : undefined}>
          <p className="mb-1 uppercase tracking-wider text-slate-400">Viewing score</p>
          <div className="h-2.5 rounded-full bg-black/60" style={{ backgroundImage: GRADIENT }} />
          <div className="mt-1 flex justify-between text-slate-300">
            <span>Worse</span>
            <span>Better →</span>
          </div>
        </div>
      )}
      {caption && <p className="mt-1 text-slate-400">{caption}</p>}
    </div>
  );
}
