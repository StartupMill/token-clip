import type { PluginDatabaseClient } from "@paperclipai/plugin-sdk";
import { dateRange, type LedgerRow } from "./domain.js";
export const ledgerSql = `SELECT c.id, c.issue_id AS "issueId", i.identifier, i.title,
 c.agent_id AS "agentId", COALESCE(a.name, 'Deleted agent') AS agent,
 c.provider, c.model, c.billing_type AS "billingType", c.cost_status AS "costStatus",
 c.input_tokens AS "inputTokens", c.cached_input_tokens AS "cachedInputTokens",
 c.output_tokens AS "outputTokens", c.cost_cents AS "costCents",
 c.occurred_at::text AS "occurredAt", c.heartbeat_run_id AS "runId", h.status
 FROM public.cost_events c
 LEFT JOIN public.issues i ON i.id=c.issue_id AND i.company_id=c.company_id
 LEFT JOIN public.agents a ON a.id=c.agent_id AND a.company_id=c.company_id
 LEFT JOIN public.heartbeat_runs h ON h.id=c.heartbeat_run_id AND h.company_id=c.company_id
 WHERE c.company_id=$1 AND c.occurred_at >= $2 AND c.occurred_at < $3
 AND (c.occurred_at, c.id) > ($4::timestamptz, $5::uuid)
 ORDER BY c.occurred_at, c.id LIMIT 1000`;
export const unmeteredSql = `SELECT count(*)::int AS count FROM public.heartbeat_runs h
 WHERE h.company_id=$1 AND h.created_at >= $2 AND h.created_at < $3
 AND h.status NOT IN ('queued','running')
 AND NOT EXISTS (SELECT 1 FROM public.cost_events c WHERE c.heartbeat_run_id=h.id AND c.company_id=h.company_id)`;
export async function readLedger(
  db: PluginDatabaseClient,
  companyId: unknown,
  from: unknown,
  to: unknown,
) {
  if (
    typeof companyId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      companyId,
    )
  )
    throw new Error("A valid company ID is required.");
  const range = dateRange(from, to);
  const rows: LedgerRow[] = [];
  let cursor = range.start,
    id = "00000000-0000-0000-0000-000000000000";
  while (true) {
    const batch = await db.query<LedgerRow>(ledgerSql, [
      companyId,
      range.start,
      range.end,
      cursor,
      id,
    ]);
    for (const row of batch)
      rows.push({ ...row, occurredAt: new Date(row.occurredAt).toISOString() });
    if (batch.length < 1000) break;
    if (rows.length >= 100_000)
      throw new Error(
        "This range contains at least 100,000 usage records. Select a shorter range; no partial totals are shown.",
      );
    const last = batch[batch.length - 1]!;
    // Preserve the original timestamp precision in the cursor.
    cursor = last.occurredAt;
    id = last.id;
  }
  const missing = await db.query<{ count: number }>(unmeteredSql, [
    companyId,
    range.start,
    range.end,
  ]);
  return {
    rows,
    unmeteredRuns: Number(missing[0]?.count ?? 0),
    from: range.from,
    to: range.to,
  };
}
