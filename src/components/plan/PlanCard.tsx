import type { PlanResponse } from "@/lib/types";

export function PlanCard({ result }: { result: PlanResponse }) {
  const { plan, validation } = result;
  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className="space-y-2 rounded-xl bg-black/75 p-4 text-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Your plan</h3>
        <span className="text-xs text-slate-400">
          confidence {plan.confidence}
          {validation.fallback ? " · template" : ""}
        </span>
      </div>
      <p className="text-slate-200">{plan.destinationLabel}</p>
      <p className="text-slate-300">
        Leave by <b>{fmt(plan.departBy)}</b>. Watch <b>{fmt(plan.windowStart)}</b> – <b>{fmt(plan.windowEnd)}</b>.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-slate-300">
        {plan.why.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
      {plan.alternatives.length > 0 && (
        <p className="text-xs text-slate-400">
          Also: {plan.alternatives.map((a) => `${a.cellId} (${a.reason})`).join("; ")}
        </p>
      )}
      {!validation.ok && (
        <p className="text-xs text-amber-300">AI plan failed validation after {validation.attempts} attempts; showing template.</p>
      )}
    </div>
  );
}
