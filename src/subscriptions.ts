import type { Report, PricedRow } from "./domain.js";
export const slots = [
  { id: "openai", label: "GPT / OpenAI" },
  { id: "anthropic", label: "Claude" },
  { id: "xai", label: "xAI / Grok" },
  { id: "google", label: "Google Gemini" },
  { id: "custom", label: "Custom provider" },
] as const;
export type SlotId = (typeof slots)[number]["id"];
export type Plans = { fees: Record<SlotId, string>; customProvider: string };
export const emptyPlans = (): Plans => ({
  fees: { openai: "", anthropic: "", xai: "", google: "", custom: "" },
  customProvider: "",
});
export function feeValue(value: string): number | null {
  return value.trim() !== "" &&
    /^\d+(\.\d{0,2})?$/.test(value) &&
    Number.isFinite(Number(value))
    ? Number(value)
    : null;
}
function canonical(value: string): SlotId | null {
  const v = value.trim().toLowerCase();
  if (["openai", "gpt", "chatgpt", "codex"].includes(v)) return "openai";
  if (["anthropic", "claude"].includes(v)) return "anthropic";
  if (["xai", "x.ai", "grok"].includes(v)) return "xai";
  if (["google", "gemini", "google-ai", "google_gemini"].includes(v))
    return "google";
  return null;
}
// Explicit providers win. Model fallback applies only when the ledger provider is absent/unknown.
export function matchSlot(
  row: Pick<PricedRow, "provider" | "model">,
  custom: string,
): SlotId | null {
  const provider = row.provider.trim().toLowerCase();
  const known = canonical(provider);
  if (known) return known;
  if (
    custom.trim() &&
    !canonical(custom) &&
    provider === custom.trim().toLowerCase()
  )
    return "custom";
  if (provider && provider !== "unknown") return null;
  const model = row.model.toLowerCase();
  if (/^(gpt-|o[134](?:-|$)|codex)/.test(model)) return "openai";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("grok-")) return "xai";
  if (model.startsWith("gemini-")) return "google";
  return null;
}
export function blendSubscriptions(report: Report, plans: Plans) {
  const providers = slots.map((slot) => ({
    ...slot,
    fee: feeValue(plans.fees[slot.id]),
    records: 0,
    apiUsd: 0,
    unpriced: 0,
    allocated: 0,
    taskWeights: new Map<string, number>(),
  }));
  const taskCosts = new Map<
    string,
    { usd: number; complete: boolean; providers: Set<string> }
  >();
  let unmatched = 0;
  for (const row of report.rows) {
    const key = row.issueId ?? `unassigned:${row.runId ?? row.id}`;
    const task = taskCosts.get(key) ?? {
      usd: 0,
      complete: true,
      providers: new Set<string>(),
    };
    taskCosts.set(key, task);
    const id = matchSlot(row, plans.customProvider);
    const bucket = providers.find((p) => p.id === id);
    if (!bucket) {
      unmatched++;
      task.complete = false;
      continue;
    }
    bucket.records++;
    bucket.apiUsd += row.apiUsd ?? 0;
    bucket.unpriced += Number(row.apiUsd === null);
    bucket.taskWeights.set(
      key,
      (bucket.taskWeights.get(key) ?? 0) + (row.apiUsd ?? 0),
    );
    task.providers.add(bucket.label);
  }
  for (const p of providers) {
    const canAllocate =
      p.fee !== null &&
      p.unpriced === 0 &&
      (p.apiUsd > 0 || p.fee === 0) &&
      report.totals.unmeteredRuns === 0;
    for (const [key, weight] of p.taskWeights) {
      const task = taskCosts.get(key)!;
      if (!canAllocate) {
        task.complete = false;
        continue;
      }
      const amount = p.apiUsd > 0 ? (p.fee! * weight) / p.apiUsd : 0;
      task.usd += amount;
      p.allocated += amount;
    }
  }
  const totalFee = providers.reduce((sum, p) => sum + (p.fee ?? 0), 0);
  const allocated = providers.reduce((sum, p) => sum + p.allocated, 0);
  const missingFees = providers.filter(
    (p) => p.records > 0 && p.fee === null,
  ).length;
  const invalidFees = providers.some(
    (p) => plans.fees[p.id] !== "" && p.fee === null,
  );
  const complete =
    !invalidFees &&
    !missingFees &&
    !unmatched &&
    !report.totals.unpriced &&
    !report.totals.unmeteredRuns;
  return {
    providers,
    taskCosts,
    totalFee,
    allocated,
    unallocated: Math.max(0, totalFee - allocated),
    unmatched,
    missingFees,
    invalidFees,
    complete,
    hasFees: providers.some((p) => p.fee !== null),
  };
}
