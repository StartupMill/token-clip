import { useMemo, useState, useEffect } from "react";
import { auditCsv, type Report, type TaskTotal } from "../domain.js";
import {
  slots,
  emptyPlans,
  blendSubscriptions,
  type Plans,
} from "../subscriptions.js";
import { styles } from "./styles.js";
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: n > 0 && n < 0.01 ? 6 : 2,
  }).format(n);
export const count = (n: number) => new Intl.NumberFormat("en-US").format(n);
const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
export function Chart({ report }: { report: Report }) {
  const max = Math.max(1, ...report.days.map((d) => d.tokens));
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label={`Daily token usage from ${report.from} to ${report.to}, ${count(report.totals.tokens)} known tokens`}
      >
        {report.days.map((d) => (
          <div
            className="bar"
            key={d.date}
            style={{ height: `${(d.tokens / max) * 100}%` }}
            title={`${d.date} UTC · ${count(d.tokens)} tokens · ${money(d.apiUsd)} API base estimate`}
          />
        ))}
      </div>
      <div className="chart-labels">
        <span>{report.from}</span>
        <span>UTC</span>
        <span>{report.to}</span>
      </div>
    </>
  );
}
export function WidgetView({
  report,
  loading,
  error,
  href,
  onRetry,
}: {
  report: Report | null;
  loading: boolean;
  error?: string;
  href: string;
  onRetry: () => void;
}) {
  return (
    <section className="tc tc-widget">
      <style>{styles}</style>
      <div className="widget-top">
        <h3>Token spend</h3>
        <span className="muted">This month</span>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error} <button onClick={onRetry}>Retry</button>
        </p>
      ) : !report ? (
        <p className="empty">
          {loading ? "Loading usage…" : "No usage available."}
        </p>
      ) : (
        <>
          <div className="value">
            {compact(report.totals.tokens)}
            {report.totals.unknownTokenRecords > 0 ? " + unknown" : ""}
          </div>
          <p className="muted">
            tokens across {report.totals.tasks} linked tasks
          </p>
          <p style={{ marginTop: 14 }}>
            <span className="green">{money(report.totals.apiUsd)}</span>{" "}
            <span className="muted">
              API base estimate{report.totals.unpriced ? " · partial" : ""}
            </span>
          </p>
          <Chart report={report} />
          {report.totals.unpriced > 0 && (
            <p className="muted">
              {report.totals.unpriced} unpriced usage records
            </p>
          )}
          {report.totals.unmeteredRuns > 0 && (
            <p className="muted">
              {report.totals.unmeteredRuns} finished runs without ledger usage
            </p>
          )}
          <div className="widget-bottom">
            <span className="muted">
              {money(report.totals.recordedUsd)} recorded
            </span>
            <a href={href}>View token audit ↗</a>
          </div>
        </>
      )}
    </section>
  );
}
export function downloadCsv(report: Report) {
  const url = URL.createObjectURL(
    new Blob([auditCsv(report)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `token-clip-${report.from}-${report.to}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Comparison({
  report,
  plans,
  setPlans,
}: {
  report: Report;
  plans: Plans;
  setPlans: (plans: Plans) => void;
}) {
  const blend = blendSubscriptions(report, plans);
  const month = new Date(`${report.from.slice(0, 7)}-01T00:00:00Z`);
  const last = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  )
    .toISOString()
    .slice(0, 10);
  const ongoing = report.to < last;
  return (
    <section className="panel">
      <h2>Monthly subscriptions vs API</h2>
      <p className="muted">
        {month.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
        {ongoing ? " · usage so far" : ""} · USD/month
      </p>
      <p className="muted" style={{ marginTop: 8 }}>
        Enter your monthly fee for each provider you use. Leave unused slots
        blank; enter 0 only for a free plan.
      </p>
      <div className="provider-costs">
        {blend.providers.map((p) => (
          <div className="provider-cost" key={p.id}>
            <label>
              {p.label} monthly cost (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Not set"
                value={plans.fees[p.id]}
                onChange={(e) =>
                  setPlans({
                    ...plans,
                    fees: { ...plans.fees, [p.id]: e.target.value },
                  })
                }
              />
            </label>
            {p.id === "custom" && (
              <label>
                Custom ledger provider
                <input
                  placeholder="e.g. mistral"
                  value={plans.customProvider}
                  onChange={(e) =>
                    setPlans({ ...plans, customProvider: e.target.value })
                  }
                />
              </label>
            )}
            <small>
              {p.records
                ? `${p.records} records · ${money(p.apiUsd)} API estimate${p.unpriced ? ` · ${p.unpriced} unpriced` : ""}`
                : "No matched usage this month"}
            </small>
          </div>
        ))}
      </div>
      <div className="comparison-result">
        <p>
          Combined monthly fees:{" "}
          <strong>{blend.hasFees ? money(blend.totalFee) : "Not set"}</strong>
        </p>
        <p>
          API-equivalent usage{ongoing ? " so far" : ""}:{" "}
          <strong className="green">{money(report.totals.apiUsd)}</strong>
          {report.totals.unpriced ? " + unpriced usage" : ""}
        </p>
        {blend.hasFees && blend.complete ? (
          <p style={{ marginTop: 8 }}>
            <strong>
              {money(Math.abs(blend.totalFee - report.totals.apiUsd))}
            </strong>
            {blend.totalFee > report.totals.apiUsd
              ? " of additional API-equivalent usage would match your combined monthly fees."
              : " more in API-equivalent usage than your combined monthly fees."}
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            Set costs for used providers. Missing fees, unmatched providers or
            incomplete usage prevent a full comparison.
          </p>
        )}
        {blend.invalidFees && (
          <p className="error" role="alert">
            Use a nonnegative monthly amount with up to two decimal places.
          </p>
        )}
        {blend.unmatched > 0 && (
          <p className="notice">
            {blend.unmatched} usage records do not match a slot. Set the custom
            ledger provider to its exact provider name.
          </p>
        )}
        {blend.hasFees && (
          <p className="muted" style={{ marginTop: 8 }}>
            {money(blend.allocated)} allocated across tasks ·{" "}
            {money(blend.unallocated)} unallocated (unused provider or
            incomplete pricing).
          </p>
        )}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Each provider’s fee is divided by tasks’ share of its API-equivalent
        usage, then combined per task. Allocated subscription costs are
        estimates, not extra charges.{" "}
        {ongoing
          ? "The month is still in progress; allocations will shift as usage grows. "
          : ""}
        Only Paperclip usage is included; work elsewhere also contributes to
        subscription value.
      </p>
    </section>
  );
}
function Price({ task }: { task: TaskTotal }) {
  return (
    <>
      {task.records === task.unpriced ? "Unpriced" : money(task.apiUsd)}
      {task.unpriced > 0 && task.records !== task.unpriced && (
        <small> + unpriced</small>
      )}
    </>
  );
}
export function AuditView({
  report,
  taskHref,
  onExport = downloadCsv,
  companyId = "preview",
}: {
  report: Report;
  taskHref: (id: string) => string;
  onExport?: (report: Report) => void;
  companyId?: string;
}) {
  const storageKey = `token-clip:monthly-plans:${companyId}:${report.from.slice(0, 7)}`;
  const [plans, setPlans] = useState<Plans>(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(storageKey) ?? "null",
      );
      if (
        saved &&
        typeof saved.customProvider === "string" &&
        slots.every((s) => typeof saved.fees?.[s.id] === "string")
      )
        return saved;
    } catch {}
    return emptyPlans();
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(plans));
    } catch {}
  }, [storageKey, plans]);
  const blend = useMemo(
    () => blendSubscriptions(report, plans),
    [report, plans],
  );
  const [query, setQuery] = useState(""),
    [model, setModel] = useState(""),
    [sort, setSort] = useState("cost"),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(
    () =>
      report.tasks
        .filter(
          (t) =>
            (!model || t.models.includes(model)) &&
            `${t.identifier} ${t.title} ${t.models.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "tokens"
            ? b.tokens - a.tokens
            : sort === "recent"
              ? b.lastAt.localeCompare(a.lastAt)
              : b.apiUsd - a.apiUsd,
        ),
    [report, query, model, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 25)),
    current = Math.min(page, pages - 1);
  const models = [...new Set(report.rows.map((r) => r.model))].sort();
  const detail = report.tasks.find((t) => t.key === selected);
  const detailRows = detail
    ? report.rows.filter(
        (r) => (r.issueId ?? `unassigned:${r.runId ?? r.id}`) === detail.key,
      )
    : [];
  function change(fn: () => void) {
    fn();
    setPage(0);
  }
  const totals = report.totals;
  return (
    <>
      <div className="metrics">
        <div className="metric">
          <span className="muted">Tokens consumed</span>
          <div className="value">{compact(totals.tokens)}</div>
          <small>
            {totals.unknownTokenRecords
              ? `${totals.unknownTokenRecords} records with unknown totals`
              : "Includes cached input, counted once"}
          </small>
        </div>
        <div className="metric">
          <span className="muted">API base estimate</span>
          <div className="value green">{money(totals.apiUsd)}</div>
          <small>
            {totals.unpriced
              ? `${totals.unpriced} records still unpriced`
              : "All ledger records have a model rate"}
          </small>
        </div>
        <div className="metric">
          <span className="muted">Recorded by Paperclip</span>
          <div className="value">{money(totals.recordedUsd)}</div>
          <small>May omit subscriptions and other charges</small>
        </div>
        <div className="metric">
          <span className="muted">Tasks with usage</span>
          <div className="value">{count(totals.tasks)}</div>
          <small>
            {count(totals.records)} usage records, including retries
          </small>
        </div>
      </div>
      {(totals.unpriced > 0 || totals.unmeteredRuns > 0) && (
        <p className="notice" role="status">
          {totals.unpriced > 0
            ? `${totals.unpriced} usage records have no usable rate. Estimates show only the priced portion. `
            : ""}
          {totals.unmeteredRuns > 0
            ? `${totals.unmeteredRuns} finished runs started in this period have no ledger entry; their usage is unknown, not zero.`
            : ""}
        </p>
      )}
      <div className="split">
        <section className="panel">
          <h2>Token activity</h2>
          <p className="muted">
            Usage recorded each day · cached input counted once
          </p>
          <Chart report={report} />
        </section>
        <Comparison report={report} plans={plans} setPlans={setPlans} />
      </div>
      <div className="table-tools">
        <div>
          <h2>Task cost audit</h2>
          <p className="muted">Open a row to inspect every usage record.</p>
        </div>
        <button disabled={!report.rows.length} onClick={() => onExport(report)}>
          Export full audit CSV ↓
        </button>
      </div>
      <div className="filters">
        <label>
          Find a task
          <input
            type="search"
            placeholder="Task, title or model…"
            value={query}
            onChange={(e) => change(() => setQuery(e.target.value))}
          />
        </label>
        <label>
          Tasks using model
          <select
            value={model}
            onChange={(e) => change(() => setModel(e.target.value))}
          >
            <option value="">All models</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select
            value={sort}
            onChange={(e) => change(() => setSort(e.target.value))}
          >
            <option value="cost">Highest API estimate</option>
            <option value="tokens">Most tokens</option>
            <option value="recent">Most recent</option>
          </select>
        </label>
      </div>
      {!filtered.length ? (
        <p className="empty">
          {report.rows.length
            ? "No tasks match these filters."
            : "No token usage recorded for this period. New usage appears after Paperclip records it."}
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Models</th>
                <th className="num">Records</th>
                <th className="num">Tokens</th>
                <th className="num">Recorded USD</th>
                <th className="num">API base estimate</th>
                <th className="num">Allocated subscription</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(current * 25, (current + 1) * 25).map((t) => (
                <tr key={t.key}>
                  <td>
                    <button
                      className="task-button"
                      onClick={() =>
                        setSelected(selected === t.key ? null : t.key)
                      }
                      aria-expanded={selected === t.key}
                    >
                      <span className="task-link">{t.identifier} ↗</span>
                      <div className="task-title">{t.title}</div>
                    </button>
                  </td>
                  <td className="model">{t.models.join(", ")}</td>
                  <td className="num">{count(t.records)}</td>
                  <td className="num">
                    {count(t.tokens)}
                    {t.unknownTokenRecords ? " + unknown" : ""}
                  </td>
                  <td className="num">{money(t.recordedUsd)}</td>
                  <td className="num">
                    <Price task={t} />
                  </td>
                  <td
                    className="num"
                    title="Monthly provider fees allocated by API-equivalent usage share"
                  >
                    {blend.taskCosts.get(t.key)?.complete
                      ? money(blend.taskCosts.get(t.key)!.usd)
                      : (blend.taskCosts.get(t.key)?.usd ?? 0) > 0
                        ? `${money(blend.taskCosts.get(t.key)!.usd)} + incomplete`
                        : "Incomplete"}
                    <br />
                    <small>
                      {[...(blend.taskCosts.get(t.key)?.providers ?? [])].join(
                        " + ",
                      )}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <small>
          {filtered.length} task groups · task totals include all models
        </small>
        <div className="actions">
          <button disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <small>
            {current + 1} / {pages}
          </small>
          <button
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {detail && (
        <section className="panel detail" aria-label="Usage record details">
          <div className="head">
            <div>
              <h2>{detail.identifier} · Usage records</h2>
              {detail.issueId && (
                <a className="task-link" href={taskHref(detail.issueId)}>
                  Open task in Paperclip ↗
                </a>
              )}
            </div>
            <button onClick={() => setSelected(null)}>Close details</button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time (UTC) / event</th>
                  <th>Agent / model</th>
                  <th>Status / billing</th>
                  <th className="num">Uncached input</th>
                  <th className="num">Cached input</th>
                  <th className="num">Output</th>
                  <th className="num">Recorded</th>
                  <th className="num">API estimate</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.occurredAt.slice(0, 19).replace("T", " ")}
                      <br />
                      <small title={r.id}>{r.id.slice(0, 8)}</small>
                    </td>
                    <td>
                      {r.agent}
                      <br />
                      <small>{r.model}</small>
                    </td>
                    <td>
                      {r.status ?? "No run"}
                      <br />
                      <small>
                        {r.billingType} · {r.costStatus}
                      </small>
                    </td>
                    <td className="num">
                      {r.uncached === null ? "Unknown" : count(r.uncached)}
                    </td>
                    <td className="num">{count(r.cachedInputTokens)}</td>
                    <td className="num">{count(r.outputTokens)}</td>
                    <td className="num">{money(r.costCents / 100)}</td>
                    <td className="num" title={r.warning ?? ""}>
                      {r.apiUsd === null ? "Unpriced" : money(r.apiUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <details>
        <summary>Pricing and accounting assumptions</summary>
        <p className="muted" style={{ margin: "14px 0" }}>
          USD per million tokens. Exact provider/model matching; configure
          additional models in Token Clip settings. These are current configured
          base rates applied to historical usage, not historical invoices.
          Claude cache-write premiums, mixed-model attribution, provider tiers,
          long-context premiums, tool charges, taxes and subscriptions may be
          absent. Recorded charges are Paperclip ledger values, rounded to cents
          by the host. Unassigned usage stays visible. CSV exports retain
          applied rates and sources.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Provider / model</th>
                <th>Input</th>
                <th>Cached</th>
                <th>Output</th>
                <th>Verified / source</th>
              </tr>
            </thead>
            <tbody>
              {report.rates.map((r) => (
                <tr key={`${r.provider}/${r.model}`}>
                  <td>
                    {r.provider} / {r.model}
                  </td>
                  <td>{money(r.input)}</td>
                  <td>{money(r.cached)}</td>
                  <td>{money(r.output)}</td>
                  <td>
                    {/^https?:\/\//.test(r.source) ? (
                      <a href={r.source} target="_blank" rel="noreferrer">
                        {r.verified} ↗
                      </a>
                    ) : (
                      `${r.verified} · ${r.source}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <footer className="foot">
        Paperclip cost ledger · {report.from} through {report.to} (UTC) ·
        Refreshed {new Date(report.generatedAt).toLocaleTimeString()} · Figures
        update after usage is recorded.
      </footer>
    </>
  );
}
