# Accounting contract

## Source of truth

One `cost_events` row is one audit record. Records are never added again from heartbeat JSON, avoiding double-counting the same run. Multiple ledger records per run and multiple runs per task are legitimate and all count. Unlinked events are grouped by run, or by event when no run exists. The task count counts linked task IDs only.

Core tables are read-only. Every query is parameterized and company-scoped, including issue/agent/run joins. Company scope is supplied by the Paperclip host bridge; the SDK overrides any conflicting nested company value. Run snippets, prompts, credentials and result payloads are never selected.

UTC dates include the entire final day using an exclusive next-day boundary. Event date is `occurred_at` (the ledger recording time), not task creation or completion date. Cross-midnight work is attributed when recorded. Pagination uses `(occurred_at, id)` and retains PostgreSQL microseconds. At 100,000 records the request fails explicitly rather than returning truncated totals; choose a shorter period. Historical edits during pagination are not protected by a database snapshot; refresh/export after reconciliation settles.

## Formula

For an inclusive-input provider:

```
uncached = input - cached
unique tokens = uncached + cached + output
USD = (uncached × inputRate + cached × cacheRate + output × outputRate) / 1,000,000
```

For an exclusive-input provider, `uncached = input`; all other steps are identical. Cached tokens contribute once to the total. Rates are configured in USD per million. Monetary values retain fractional cents through aggregation and CSV export. Display rounding happens at rendering time. The host's recorded cost is already stored as integer cents.

## Coverage

Finished runs **created** in the selected UTC range without any linked ledger event are counted separately as unmetered. This does not imply they consumed tokens: some may fail before model invocation. Queued/running runs are excluded from that diagnostic. A run begun outside the range is not included in this diagnostic, even if it finished within the range. It may still contribute a ledger event within the range.

The API estimate only covers retained ledger events. It cannot recover absent telemetry, deleted history or work performed outside Paperclip. Unknown cache conventions prevent a reliable total-token count; raw input/cache/output remain available in CSV. Known conventions with unknown model rates still contribute known tokens, with costs left unpriced.

For multi-model Claude invocations, Paperclip may aggregate counters while retaining only one model label. This estimate uses the ledger label and explicitly warns about model mixing; it does not claim an exact reconstruction. Accurate invoice reconciliation requires provider billing records and per-request pricing metadata unavailable in this ledger contract.

## Comparison

The audit selects a UTC calendar month. Past months include the full month; the current month ends today. The dashboard uses month-to-date usage.

Enter the full monthly AI subscription price in USD. Compare it with the base API value of recorded Paperclip usage for that month. For a month in progress, the difference is described as usage still needed to match the fee, not a final savings verdict or forecast. Missing usage or unpriced records suppress the comparison verdict. Work outside Paperclip on the same subscription also contributes to its value. Five monthly inputs cover GPT/OpenAI, Claude, xAI/Grok, Google Gemini and an exact custom ledger provider. Browser local storage keeps costs separately by company and month; values are not synced to the server or other browsers. Clearing browser storage removes them.


### Matching and blended task allocation

Known provider aliases match the four named slots. Model-family matching is a fallback only for absent/unknown providers. Explicit routing providers (for example OpenRouter) stay unmatched unless selected as the custom ledger provider; a Claude model routed elsewhere is not automatically billed to the Claude subscription.

For each fully priced provider: task allocation = entered monthly fee × task API estimate / provider API estimate. Multi-provider task allocations are added together. Missing fees are different from an explicitly free ($0) plan. Unpriced provider records, absent run telemetry or zero weights with a positive fee prevent allocation. Fees for providers without usage remain in the combined fee and are shown as unallocated. Rounding occurs only for display; displayed task rows may differ from the total by cents.

The allocation is a scenario allocating full provider fees across Paperclip work, not an invoice or incremental charge. It does not infer whether a particular run was actually covered by a subscription; the recorded billing type remains available in the audit. External usage is not measured. The raw ledger CSV retains provider/model usage and rates; browser subscription scenarios and allocation amounts are not included in that raw export.

Matching a slot does not invent API prices. xAI, Gemini and custom model IDs require exact configured model rates when absent from the rate snapshot. Their matching records remain unpriced until configured.
