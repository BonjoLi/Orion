import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClient, hasApiKey, MODEL } from "@/lib/ai/client";
import { SYSTEM_PROMPT, tableForPrompt } from "@/lib/ai/prompt";
import { validatePlan } from "@/lib/ai/validate";
import { Plan, type PlanResponse, type ScoreResponse } from "@/lib/types";

const MAX_ATTEMPTS = 3; // initial + 2 retries, as ContainOS does

/**
 * One structured call to Claude, validated against the score table.
 * On repeated violation → deterministic fallback plan with confidence 0.
 */
export async function makePlan(score: ScoreResponse): Promise<PlanResponse> {
  if (!hasApiKey() || score.cells.length === 0) {
    return { plan: fallbackPlan(score), validation: { ok: true, attempts: 0, violations: [], fallback: true }, score };
  }

  const client = getClient();
  const table = tableForPrompt(score);
  let feedback = "";
  let violations: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      output_config: { format: zodOutputFormat(Plan), effort: "low" },
      cache_control: { type: "ephemeral" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${table}\n\nWrite the plan as JSON.${feedback}`,
        },
      ],
    });

    const plan = response.parsed_output;
    if (!plan) {
      violations = ["model output did not parse against the Plan schema"];
    } else {
      violations = validatePlan(plan, score);
      if (violations.length === 0) {
        return { plan, validation: { ok: true, attempts: attempt, violations: [], fallback: false }, score };
      }
    }
    feedback = `\n\nYour previous answer violated these rules; fix every one:\n- ${violations.join("\n- ")}`;
  }

  return { plan: fallbackPlan(score), validation: { ok: false, attempts: MAX_ATTEMPTS, violations, fallback: true }, score };
}

/** Template plan built from the top row. Used without an API key or after validation failure. */
export function fallbackPlan(score: ScoreResponse): Plan {
  const top = score.cells[0];
  if (!top) {
    return {
      destinationId: "none",
      destinationLabel: "No candidate locations",
      departBy: score.event.windowStart,
      windowStart: score.event.windowStart,
      windowEnd: score.event.windowEnd,
      why: ["No grid cells were scored."],
      alternatives: [],
      confidence: 0,
    };
  }
  const best = top.hours.find((h) => h.hour === top.bestHour) ?? top.hours[0];
  const departBy = new Date(Date.parse(top.bestHour) - 2 * 3600 * 1000).toISOString();
  return {
    destinationId: top.cell.id,
    destinationLabel: `${top.cell.lat}, ${top.cell.lon} (${top.cell.distanceKm} km away)`,
    departBy: departBy < score.event.windowStart ? score.event.windowStart : departBy,
    windowStart: top.bestHour,
    windowEnd: new Date(Math.min(Date.parse(top.bestHour) + 2 * 3600 * 1000, Date.parse(score.event.windowEnd))).toISOString(),
    why: [
      `Highest score in range: ${top.bestScore}/100 at ${top.bestHour}.`,
      `Cloud cover low ${best.cloudLow}%, mid ${best.cloudMid}%, high ${best.cloudHigh}%.`,
      `Moon ${Math.round(best.moonIllum * 100)}% illuminated at altitude ${best.moonAlt}°.`,
    ],
    alternatives: score.cells.slice(1, 3).map((c) => ({ cellId: c.cell.id, reason: `Score ${c.bestScore} at ${c.bestHour}.` })),
    confidence: 0,
  };
}
