import type { Plan, ScoreResponse } from "@/lib/types";

// Deterministic validation of the AI plan against the score table.
// Mirrors the ContainOS pattern: if the model contradicts the ground truth,
// we tell it exactly how and let it try again (see plan.ts).

export function validatePlan(plan: Plan, score: ScoreResponse): string[] {
  const violations: string[] = [];
  const ids = new Set(score.cells.map((c) => c.cell.id));
  const winStart = Date.parse(score.event.windowStart);
  const winEnd = Date.parse(score.event.windowEnd);
  const bestScore = score.cells[0]?.bestScore ?? 0;

  if (!ids.has(plan.destinationId)) violations.push(`destinationId "${plan.destinationId}" is not a cell id in the table`);
  for (const alt of plan.alternatives) {
    if (!ids.has(alt.cellId)) violations.push(`alternatives cellId "${alt.cellId}" is not a cell id in the table`);
    if (alt.cellId === plan.destinationId) violations.push(`alternative "${alt.cellId}" duplicates the destination`);
  }

  for (const [field, value] of [
    ["windowStart", plan.windowStart],
    ["windowEnd", plan.windowEnd],
  ] as const) {
    const t = Date.parse(value);
    if (Number.isNaN(t)) violations.push(`${field} is not a valid ISO timestamp`);
    else if (t < winStart || t > winEnd) violations.push(`${field} ${value} is outside the event window`);
  }
  if (Date.parse(plan.windowStart) >= Date.parse(plan.windowEnd)) violations.push("windowStart must be before windowEnd");

  const depart = Date.parse(plan.departBy);
  if (Number.isNaN(depart)) violations.push("departBy is not a valid ISO timestamp");
  else if (depart > Date.parse(plan.windowStart)) violations.push("departBy must be before windowStart");

  if (plan.confidence > bestScore) violations.push(`confidence ${plan.confidence} exceeds best score ${bestScore}`);

  // Numbers quoted in prose must exist somewhere in the table (loose check:
  // any integer/decimal mentioned must match some table value within 0.5).
  const tableNumbers = new Set<number>();
  for (const c of score.cells.slice(0, 8)) {
    tableNumbers.add(c.cell.distanceKm);
    tableNumbers.add(c.bestScore);
    for (const h of c.hours) {
      for (const v of [h.score, h.cloudLow, h.cloudMid, h.cloudHigh, h.moonIllum, h.moonAlt, h.sunAlt, h.targetAlt ?? NaN]) {
        if (Number.isFinite(v)) tableNumbers.add(v);
      }
    }
  }
  const prose = [...plan.why, ...plan.alternatives.map((a) => a.reason)].join(" ");
  for (const m of prose.matchAll(/(?<![\d:T-])(\d+(?:\.\d+)?)(?![\d:])/g)) {
    const n = Number(m[1]);
    // skip clock-ish and tiny ordinals
    if (n < 3) continue;
    const ok = [...tableNumbers].some((v) => Math.abs(v - n) <= 0.5 || Math.abs(v * 100 - n) <= 0.5);
    if (!ok) violations.push(`number ${n} in prose does not appear in the table`);
  }

  return violations;
}
