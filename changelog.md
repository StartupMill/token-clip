# Changelog

## 0.1.0 — 2026-10-08

- Added Token Clip Paperclip plugin with a 14-day dashboard card and task cost audit.
- Added read-only, company-scoped cost-event queries with stable timestamp/ID pagination and missing-usage diagnostics.
- Added provider-aware cached token accounting, eight sourced base-rate presets, custom exact-model rates and explicit unpriced states.
- Added task/run record detail, search, model filtering, sorting, pagination and formula-safe CSV export.
- Added manual all-in period cost comparison with an optional other-system baseline.
- Added responsive UI, labelled synthetic preview, accounting/installation documentation and automated tests.

## Monthly comparison refinement — 2026-10-08

- Replaced arbitrary date controls with a calendar-month selector and month-to-date dashboard.
- Replaced generic setup/other-system costs with one monthly subscription price.
- Added explicit in-progress month wording and suppressed verdicts for incomplete usage coverage.
- Tested month boundaries, leap years and monthly comparison states.

## Five-provider monthly costs — 2026-10-08

- Added GPT/OpenAI, Claude, xAI/Grok, Google Gemini and custom monthly fee slots.
- Added provider/model matching, blended task allocations, and explicit unused/incomplete cost handling.
- Remember monthly inputs in browser storage by company and month.
- Added tests for mixed-provider tasks, missing/free fees, custom routing, incomplete telemetry and browser persistence.

## Repository handoff — 2026-10-08

- Added GitHub repository metadata, pinned development tool versions, automated build/test/package checks, and Mac mini installation/acceptance instructions.
