import { describe, it, expect } from "vitest";
import {
  priceRow,
  defaultRates,
  ratesFromConfig,
  buildReport,
  dateRange,
  auditCsv,
} from "../src/domain.js";
import { row } from "./fixtures.js";
describe("API-equivalent accounting", () => {
  it("counts OpenAI cached input once and applies the discounted price", () => {
    const r = priceRow(row(), defaultRates);
    expect(r.tokens).toBe(1_100_000);
    expect(r.uncached).toBe(400_000);
    expect(r.apiUsd).toBeCloseTo(2.65);
  });
  it("treats Anthropic input and cache as separate buckets", () => {
    const r = priceRow(
      row({ provider: "anthropic", model: "claude-sonnet-4-6" }),
      defaultRates,
    );
    expect(r.tokens).toBe(1_700_000);
    expect(r.apiUsd).toBeCloseTo(4.68);
    expect(r.warning).toContain("cache-write");
  });
  it("does not guess unknown models or providers", () => {
    expect(
      priceRow(row({ model: "gpt-5.4-pro" }), defaultRates).apiUsd,
    ).toBeNull();
    const r = priceRow(row({ provider: "custom" }), defaultRates);
    expect(r.tokens).toBeNull();
    expect(r.apiUsd).toBeNull();
  });
  it.each([
    { inputTokens: -1 },
    { inputTokens: NaN },
    { cachedInputTokens: 2_000_000 },
    { outputTokens: 1.5 },
  ])("rejects invalid usage %j", (patch) => {
    const r = priceRow(row(patch), defaultRates);
    expect(r.tokens).toBeNull();
    expect(r.apiUsd).toBeNull();
  });
  it("allows explicit zero rates and exact custom overrides", () => {
    const rate = { ...defaultRates[0]!, input: 0, cached: 0, output: 0 };
    expect(priceRow(row(), ratesFromConfig({ rates: [rate] })).apiUsd).toBe(0);
    expect(() => ratesFromConfig({ rates: [rate, rate] })).toThrow("Duplicate");
    expect(() =>
      ratesFromConfig({ rates: [{ ...rate, input: Infinity }] }),
    ).toThrow();
  });
  it("includes failures and retries, preserves sub-cent precision and unassigned usage", () => {
    const rows = [
      row({ costCents: 1 }),
      row({
        id: "retry",
        status: "failed",
        inputTokens: 10,
        cachedInputTokens: 0,
        outputTokens: 1,
      }),
      row({ id: "other", issueId: null, model: "unknown" }),
    ];
    const r = buildReport(rows, defaultRates, "2026-10-01", "2026-10-08", 2);
    expect(r.tasks).toHaveLength(2);
    expect(r.totals.tasks).toBe(1);
    expect(r.totals.records).toBe(3);
    expect(r.tasks.find((t) => t.issueId)?.records).toBe(2);
    expect(r.totals.apiUsd).toBeCloseTo(2.65004);
    expect(r.totals.unpriced).toBe(1);
    expect(r.totals.recordedUsd).toBe(0.01);
    expect(r.totals.unmeteredRuns).toBe(2);
    expect(r.days).toHaveLength(8);
  });
  it("renders valid empty periods and rejects malformed or excessive ranges", () => {
    expect(
      buildReport([], defaultRates, "2026-10-08", "2026-10-08").totals.tokens,
    ).toBe(0);
    expect(() => dateRange("2026-02-30", "2026-03-01")).toThrow();
    expect(() => dateRange("2026-10-09", "2026-10-08")).toThrow();
    expect(() => dateRange("2024-01-01", "2026-01-01")).toThrow();
  });
  it("exports auditable precision, rates and formula-safe titles", () => {
    const r = buildReport(
      [row({ title: '=HYPERLINK("bad")', model: "unknown" })],
      defaultRates,
      "2026-10-08",
      "2026-10-08",
    );
    const csv = auditCsv(r);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain("Rate verified");
    expect(csv).toContain("No exact provider/model rate");
    expect(csv).not.toContain("undefined");
  });
});

it("uses calendar months, including leap years and month-to-date", async () => {
  const { monthRange } = await import("../src/domain.js");
  const now = new Date("2026-10-08T12:00:00Z");
  expect(monthRange("2026-10", now)).toEqual({
    from: "2026-10-01",
    to: "2026-10-08",
  });
  expect(monthRange("2024-02", now)).toEqual({
    from: "2024-02-01",
    to: "2024-02-29",
  });
  expect(monthRange("2026-09", now)).toEqual({
    from: "2026-09-01",
    to: "2026-09-30",
  });
  expect(() => monthRange("2026-11", now)).toThrow();
  expect(() => monthRange("2026-13", now)).toThrow();
});
