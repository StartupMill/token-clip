# Verification — 2026-10-08

## Automated

`pnpm check` passed on Node 26.8.1:

- TypeScript strict checking.
- 30 Vitest tests across five files.
- SDK worker, manifest and UI bundle build.

Tests include OpenAI/Anthropic cache conventions, fractional-cent accumulation, unknown/invalid usage, zero custom prices, duplicate rate rejection, UTC date validation, failed/retried runs, unassigned events, CSV escaping/formula protection, real PostgreSQL execution through PGlite, 1,001-record pagination at a shared microsecond timestamp, company filtering and foreign-company join redaction, actual SDK manifest validation and worker handler registration, UI filtering/drill-down/export/comparison/pagination/error states.

`pnpm smoke:worker` passed against the compiled worker through real stdin/stdout JSON-RPC. It initialized the SDK, handled an audit request, used the host-authorized company instead of a conflicting nested company ID, read company configuration and returned health. Database/config services were stubbed for this smoke check; PostgreSQL query behavior is covered separately by PGlite tests.

The release archive was extracted into an isolated temporary directory with no `node_modules`; the same stdin/stdout worker smoke passed there. No runtime dependency install was needed.

## Browser

The synthetic preview rendered in the Codex browser at 1280px and 390px widths. DOM measurements showed no document overflow at either width. Comparison input updates and task detail expansion were verified in the rendered UI. The normal viewport was restored afterwards.

All preview values are labelled illustrative. No sample records were written into Paperclip.

## Scope

Built against the pinned SDK/shared archives and checked against the local Paperclip source contract. No running local Paperclip server was found during this task. **This release has not been installed or verified against the user's live instance, and it has not been published to npm.** Follow the README installation instructions on the intended server, then verify dashboard registration and compare a real ledger event with the CSV output. Compatibility with other host releases is not guaranteed.

Monthly refinement: calendar-month boundaries, leap years, monthly fee wording and incomplete-coverage handling are covered by the updated automated suite.

Five-provider refinement: tested allocation weights across multi-provider tasks, provider aliases, explicit routing, incomplete pricing/telemetry, unused fees, free versus missing fees, and company/month browser storage isolation. Rendered inputs, combined totals, task allocations and persistence after reload were checked with illustrative data.
