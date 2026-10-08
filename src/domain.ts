export type Rate = {
  provider: string;
  model: string;
  input: number;
  cached: number;
  output: number;
  inputIncludesCache: boolean;
  source: string;
  verified: string;
};
export type LedgerRow = {
  id: string;
  issueId: string | null;
  identifier: string | null;
  title: string | null;
  agentId: string;
  agent: string;
  provider: string;
  model: string;
  billingType: string;
  costStatus: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costCents: number;
  occurredAt: string;
  runId: string | null;
  status: string | null;
};
export type PricedRow = LedgerRow & {
  tokens: number | null;
  uncached: number | null;
  apiUsd: number | null;
  rate: Rate | null;
  warning: string | null;
};
export type TaskTotal = {
  key: string;
  issueId: string | null;
  identifier: string;
  title: string;
  records: number;
  tokens: number;
  unknownTokenRecords: number;
  apiUsd: number;
  unpriced: number;
  recordedUsd: number;
  models: string[];
  lastAt: string;
};
export type Report = {
  from: string;
  to: string;
  generatedAt: string;
  rows: PricedRow[];
  tasks: TaskTotal[];
  days: { date: string; tokens: number; apiUsd: number }[];
  totals: {
    tokens: number;
    apiUsd: number;
    recordedUsd: number;
    unpriced: number;
    unknownTokenRecords: number;
    tasks: number;
    records: number;
    unmeteredRuns: number;
  };
  rates: Rate[];
};
// Exact model matches only. These are a versioned rate snapshot, never a live tariff feed.
export const defaultRates: Rate[] = [
  {
    provider: "openai",
    model: "gpt-5.4",
    input: 2.5,
    cached: 0.25,
    output: 15,
    inputIncludesCache: true,
    source: "https://developers.openai.com/api/docs/models/gpt-5.4",
    verified: "2026-10-08",
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    input: 3,
    cached: 0.3,
    output: 15,
    inputIncludesCache: false,
    source: "https://platform.claude.com/docs/en/about-claude/pricing",
    verified: "2026-10-08",
  },
  {
    provider: "anthropic",
    model: "claude-opus-4-6",
    input: 5,
    cached: 0.5,
    output: 25,
    inputIncludesCache: false,
    source: "https://platform.claude.com/docs/en/about-claude/pricing",
    verified: "2026-10-08",
  },
  {
    provider: "openai",
    model: "gpt-6-astra",
    input: 10,
    cached: 1,
    output: 50,
    inputIncludesCache: true,
    source: "https://developers.openai.com/api/docs/pricing",
    verified: "2026-10-08",
  },
  {
    provider: "openai",
    model: "gpt-6.1-sol",
    input: 2,
    cached: 0.1,
    output: 10,
    inputIncludesCache: true,
    source: "https://developers.openai.com/api/docs/pricing",
    verified: "2026-10-08",
  },
  {
    provider: "openai",
    model: "gpt-6-luna",
    input: 0.1,
    cached: 0.01,
    output: 0.5,
    inputIncludesCache: true,
    source: "https://developers.openai.com/api/docs/pricing",
    verified: "2026-10-08",
  },
  {
    provider: "openai",
    model: "gpt-5.6-sol",
    input: 4,
    cached: 0.4,
    output: 20,
    inputIncludesCache: true,
    source: "https://developers.openai.com/api/docs/pricing",
    verified: "2026-10-08",
  },
  {
    provider: "openai",
    model: "gpt-5.3-codex",
    input: 1.75,
    cached: 0.175,
    output: 14,
    inputIncludesCache: true,
    source: "https://developers.openai.com/api/docs/pricing",
    verified: "2026-10-08",
  },
];
export function ratesFromConfig(config: Record<string, unknown>): Rate[] {
  if (config.rates === undefined) return defaultRates;
  if (!Array.isArray(config.rates)) throw new Error("Rates must be an array.");
  const overrides = new Map<string, Rate>();
  for (const value of config.rates) {
    const r = value as Rate;
    if (
      !r ||
      typeof r.provider !== "string" ||
      !r.provider.trim() ||
      typeof r.model !== "string" ||
      !r.model.trim() ||
      ![r.input, r.cached, r.output].every(
        (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
      ) ||
      typeof r.inputIncludesCache !== "boolean" ||
      typeof r.source !== "string" ||
      !r.source.trim() ||
      typeof r.verified !== "string" ||
      !validDate(r.verified)
    )
      throw new Error(
        "Each rate needs provider, exact model, nonnegative USD rates, cache convention, source, and a YYYY-MM-DD verification date.",
      );
    const key = `${r.provider}/${r.model}`;
    if (overrides.has(key)) throw new Error(`Duplicate rate: ${key}`);
    overrides.set(key, r);
  }
  return [
    ...defaultRates.filter((r) => !overrides.has(`${r.provider}/${r.model}`)),
    ...overrides.values(),
  ];
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function dateRange(from: unknown, to: unknown) {
  if (!validDate(from) || !validDate(to))
    throw new Error("Choose valid start and end dates (YYYY-MM-DD).");
  const start = Date.parse(from),
    end = Date.parse(to) + 86_400_000;
  if (end <= start || end - start > 366 * 86_400_000)
    throw new Error("Choose a date range between 1 and 366 days.");
  return {
    from,
    to,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}
export function priceRow(row: LedgerRow, rates: Rate[]): PricedRow {
  const rate =
    rates.find((r) => r.provider === row.provider && r.model === row.model) ??
    null;
  const includes =
    rate?.inputIncludesCache ??
    (row.provider === "openai"
      ? true
      : row.provider === "anthropic"
        ? false
        : null);
  const valid = [
    row.inputTokens,
    row.cachedInputTokens,
    row.outputTokens,
  ].every((n) => Number.isSafeInteger(n) && n >= 0);
  const invalid =
    !valid || (includes === true && row.cachedInputTokens > row.inputTokens);
  const uncached =
    invalid || includes === null
      ? null
      : row.inputTokens - (includes ? row.cachedInputTokens : 0);
  const tokens =
    uncached === null
      ? null
      : uncached + row.cachedInputTokens + row.outputTokens;
  const apiUsd =
    rate && uncached !== null
      ? (uncached * rate.input +
          row.cachedInputTokens * rate.cached +
          row.outputTokens * rate.output) /
        1e6
      : null;
  return {
    ...row,
    rate,
    tokens,
    uncached,
    apiUsd,
    warning: invalid
      ? "Invalid token counts"
      : includes === null
        ? "Unknown cache convention; configure a rate"
        : !rate
          ? "No exact provider/model rate"
          : row.provider === "anthropic"
            ? "Base rates; cache-write premiums and model mixing may not be represented"
            : "Base rates; excludes cache-write, tier, long-context and tool surcharges",
  };
}
export function buildReport(
  rows: LedgerRow[],
  rates: Rate[],
  from: string,
  to: string,
  unmeteredRuns = 0,
  now = new Date(),
): Report {
  const range = dateRange(from, to);
  const priced = rows.map((row) => priceRow(row, rates));
  const groups = new Map<string, TaskTotal>();
  const days = new Map<
    string,
    { date: string; tokens: number; apiUsd: number }
  >();
  for (
    let t = Date.parse(range.start);
    t < Date.parse(range.end);
    t += 86_400_000
  ) {
    const date = new Date(t).toISOString().slice(0, 10);
    days.set(date, { date, tokens: 0, apiUsd: 0 });
  }
  const totals = {
    tokens: 0,
    apiUsd: 0,
    recordedUsd: 0,
    unpriced: 0,
    unknownTokenRecords: 0,
    tasks: 0,
    records: priced.length,
    unmeteredRuns,
  };
  for (const row of priced) {
    const key = row.issueId ?? `unassigned:${row.runId ?? row.id}`;
    const task = groups.get(key) ?? {
      key,
      issueId: row.issueId,
      identifier:
        row.identifier ??
        (row.issueId ? row.issueId.slice(0, 8) : "Unassigned"),
      title: row.title ?? "Usage without a linked task",
      records: 0,
      tokens: 0,
      unknownTokenRecords: 0,
      apiUsd: 0,
      unpriced: 0,
      recordedUsd: 0,
      models: [],
      lastAt: row.occurredAt,
    };
    const recorded = Number.isFinite(row.costCents) ? row.costCents / 100 : 0;
    task.records++;
    task.tokens += row.tokens ?? 0;
    task.apiUsd += row.apiUsd ?? 0;
    task.recordedUsd += recorded;
    task.unpriced += Number(row.apiUsd === null);
    task.unknownTokenRecords += Number(row.tokens === null);
    if (!task.models.includes(row.model)) task.models.push(row.model);
    if (row.occurredAt > task.lastAt) task.lastAt = row.occurredAt;
    groups.set(key, task);
    totals.tokens += row.tokens ?? 0;
    totals.apiUsd += row.apiUsd ?? 0;
    totals.recordedUsd += recorded;
    totals.unpriced += Number(row.apiUsd === null);
    totals.unknownTokenRecords += Number(row.tokens === null);
    const day = days.get(new Date(row.occurredAt).toISOString().slice(0, 10));
    if (day) {
      day.tokens += row.tokens ?? 0;
      day.apiUsd += row.apiUsd ?? 0;
    }
  }
  totals.tasks = [...groups.values()].filter((t) => t.issueId).length;
  return {
    from,
    to,
    generatedAt: now.toISOString(),
    rows: priced,
    tasks: [...groups.values()].sort(
      (a, b) => b.apiUsd - a.apiUsd || b.lastAt.localeCompare(a.lastAt),
    ),
    days: [...days.values()],
    totals,
    rates,
  };
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function auditCsv(report: Report) {
  const header = [
    "Event ID",
    "Run ID",
    "Task ID",
    "Task",
    "Title",
    "Agent",
    "Provider",
    "Model",
    "Occurred at UTC",
    "Run status",
    "Billing type",
    "Cost status",
    "Input (source convention)",
    "Cached input",
    "Output",
    "Total tokens",
    "Recorded USD (not invoice)",
    "API base estimate USD",
    "USD/M input",
    "USD/M cached",
    "USD/M output",
    "Input includes cache",
    "Rate source",
    "Rate verified",
    "Caveat",
  ];
  const rows = report.rows.map((r) => [
    r.id,
    r.runId,
    r.issueId,
    r.identifier,
    r.title,
    r.agent,
    r.provider,
    r.model,
    r.occurredAt,
    r.status,
    r.billingType,
    r.costStatus,
    r.inputTokens,
    r.cachedInputTokens,
    r.outputTokens,
    r.tokens,
    r.costCents / 100,
    r.apiUsd,
    r.rate?.input,
    r.rate?.cached,
    r.rate?.output,
    r.rate?.inputIncludesCache,
    r.rate?.source,
    r.rate?.verified,
    r.warning,
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
  );
}

export function monthRange(month: string, now = new Date()) {
  if (!/^\d{4}-\d{2}$/.test(month) || !validDate(`${month}-01`))
    throw new Error("Choose a valid month.");
  const today = now.toISOString().slice(0, 10);
  if (month > today.slice(0, 7))
    throw new Error("Choose this month or an earlier month.");
  const from = `${month}-01`;
  const start = new Date(from);
  const last = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  )
    .toISOString()
    .slice(0, 10);
  return { from, to: last < today ? last : today };
}
