import { it, expect } from "vitest";
import { buildReport, defaultRates } from "../src/domain.js";
import {
  blendSubscriptions,
  emptyPlans,
  matchSlot,
  feeValue,
} from "../src/subscriptions.js";
import { row } from "./fixtures.js";
it("blends per-provider usage shares for tasks spanning multiple models", () => {
  const report = buildReport(
    [
      row({
        id: "1",
        issueId: "task-a",
        inputTokens: 1_000_000,
        cachedInputTokens: 0,
        outputTokens: 0,
      }),
      row({
        id: "2",
        issueId: "task-b",
        inputTokens: 3_000_000,
        cachedInputTokens: 0,
        outputTokens: 0,
      }),
      row({
        id: "3",
        issueId: "task-a",
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000_000,
        cachedInputTokens: 0,
        outputTokens: 0,
      }),
      row({
        id: "4",
        issueId: "task-b",
        provider: "anthropic",
        model: "claude-opus-4-6",
        inputTokens: 600_000,
        cachedInputTokens: 0,
        outputTokens: 0,
      }),
    ],
    defaultRates,
    "2026-10-01",
    "2026-10-08",
  );
  const plans = emptyPlans();
  plans.fees.openai = "200";
  plans.fees.anthropic = "100";
  plans.fees.xai = "20";
  const b = blendSubscriptions(report, plans);
  expect(b.taskCosts.get("task-a")?.usd).toBeCloseTo(100); // 25% of GPT + 50% of Claude
  expect(b.taskCosts.get("task-b")?.usd).toBeCloseTo(200);
  expect(b.totalFee).toBe(320);
  expect(b.allocated).toBe(300);
  expect(b.unallocated).toBe(20);
  expect(b.complete).toBe(true);
});
it("matches aliases and model fallback without overriding explicit routing providers", () => {
  expect(matchSlot({ provider: "X.ai", model: "grok-example" }, "")).toBe(
    "xai",
  );
  expect(matchSlot({ provider: "unknown", model: "gemini-example" }, "")).toBe(
    "google",
  );
  expect(
    matchSlot({ provider: "openrouter", model: "claude-sonnet-4-6" }, ""),
  ).toBeNull();
  expect(
    matchSlot(
      { provider: "openrouter", model: "claude-sonnet-4-6" },
      "openrouter",
    ),
  ).toBe("custom");
  expect(
    matchSlot({ provider: "anthropic", model: "gpt-other" }, "anthropic"),
  ).toBe("anthropic");
});
it("distinguishes missing fees from explicitly free plans", () => {
  const report = buildReport([row()], defaultRates, "2026-10-01", "2026-10-08");
  const plans = emptyPlans();
  expect(
    blendSubscriptions(report, plans).taskCosts.values().next().value?.complete,
  ).toBe(false);
  plans.fees.openai = "0";
  const b = blendSubscriptions(report, plans);
  expect(b.complete).toBe(true);
  expect(b.taskCosts.values().next().value?.usd).toBe(0);
  expect(feeValue("-1")).toBeNull();
  expect(feeValue("1.001")).toBeNull();
  expect(feeValue("Infinity")).toBeNull();
});
it("does not distribute full fees across only the priced part of a provider", () => {
  const report = buildReport(
    [row(), row({ id: "unknown", issueId: "second", model: "missing" })],
    defaultRates,
    "2026-10-01",
    "2026-10-08",
  );
  const plans = emptyPlans();
  plans.fees.openai = "200";
  const b = blendSubscriptions(report, plans);
  expect(b.allocated).toBe(0);
  expect(b.unallocated).toBe(200);
  expect(b.complete).toBe(false);
  expect([...b.taskCosts.values()].every((t) => !t.complete)).toBe(true);
});
it("does not allocate fees when completed runs lack telemetry or weights are zero", () => {
  const plans = emptyPlans();
  plans.fees.openai = "200";
  const report = buildReport(
    [row()],
    defaultRates,
    "2026-10-01",
    "2026-10-08",
    1,
  );
  expect(blendSubscriptions(report, plans).allocated).toBe(0);
  const zero = buildReport(
    [row({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 })],
    defaultRates,
    "2026-10-01",
    "2026-10-08",
  );
  expect(blendSubscriptions(zero, plans).unallocated).toBe(200);
});
