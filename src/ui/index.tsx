import { useEffect, useState } from "react";
import {
  usePluginData,
  useHostNavigation,
  type PluginPageProps,
  type PluginWidgetProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import { monthRange, type Report } from "../domain.js";
import { AuditView, WidgetView } from "./views.js";
import { styles } from "./styles.js";
function useAudit(companyId: string, from: string, to: string) {
  const result = usePluginData<Report>("audit", { companyId, from, to });
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") result.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [result.refresh]);
  return result;
}
export function TokenSpendWidget({ context }: PluginWidgetProps) {
  return context.companyId ? (
    <ConnectedWidget key={context.companyId} company={context.companyId} />
  ) : (
    <p>Select a company to view token spend.</p>
  );
}
function ConnectedWidget({ company }: { company: string }) {
  const dates = monthRange(new Date().toISOString().slice(0, 7));
  const result = useAudit(company, dates.from, dates.to);
  const nav = useHostNavigation();
  return (
    <WidgetView
      report={result.data}
      loading={result.loading}
      error={result.error?.message}
      href={nav.resolveHref("/token-clip")}
      onRetry={result.refresh}
    />
  );
}
export function TokenAuditPage({ context }: PluginPageProps) {
  return context.companyId ? (
    <ConnectedAudit key={context.companyId} company={context.companyId} />
  ) : (
    <p>Select a company to view the token audit.</p>
  );
}
function ConnectedAudit({ company }: { company: string }) {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const range = monthRange(month);
  const result = useAudit(company, range.from, range.to);
  const nav = useHostNavigation();
  // Never display a cached response for a different requested date range.
  const report =
    result.data?.from === range.from && result.data?.to === range.to
      ? result.data
      : null;
  return (
    <main className="tc">
      <style>{styles}</style>
      <header className="head">
        <div>
          <p className="eyebrow">Token Clip / Usage intelligence</p>
          <h1>Every task has a token cost.</h1>
          <p className="muted">
            See the usage. Price the work. Compare your setup.
          </p>
        </div>
        <div className="actions">
          <button disabled={result.loading} onClick={result.refresh}>
            {result.loading ? "Refreshing…" : "Refresh ↻"}
          </button>
        </div>
      </header>
      <div className="filters">
        <label>
          Month (UTC)
          <input
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(e) => {
              if (
                /^\d{4}-\d{2}$/.test(e.target.value) &&
                e.target.value <= new Date().toISOString().slice(0, 7)
              )
                setMonth(e.target.value);
            }}
          />
        </label>
        <span className="muted">
          Calendar month · current month shows usage so far
        </span>
      </div>
      {result.error ? (
        <p role="alert" className="notice error">
          Could not load the audit: {result.error.message}{" "}
          <button onClick={result.refresh}>Retry</button>
        </p>
      ) : report ? (
        <AuditView
          key={`${range.from}/${range.to}`}
          report={report}
          companyId={company}
          taskHref={(id) => nav.resolveHref(`/issues/${id}`)}
        />
      ) : (
        <p className="empty" role="status">
          Loading token audit…
        </p>
      )}
    </main>
  );
}
export function TokenSidebar(_: PluginSidebarProps) {
  const nav = useHostNavigation();
  return (
    <a
      {...nav.linkProps("/token-clip")}
      style={{
        display: "block",
        padding: "6px 16px",
        fontSize: 13,
        color: "inherit",
      }}
    >
      ◫ &nbsp; Token audit
    </a>
  );
}
