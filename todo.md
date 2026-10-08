# Token Clip

- [x] Inspect Paperclip SDK, cost ledger, token semantics, and dashboard slots.
- [x] Verify initial provider price sources.
- [x] Build company-scoped ledger reader and transparent pricing engine.
- [x] Build dashboard widget, task audit, CSV export, and comparison controls.
- [x] Test pricing, SQL boundaries, worker bridge, and UI behavior (22 tests).
- [x] Verify desktop/mobile layout and rendered interactions with labelled sample data.
- [x] Document installation, accounting assumptions, rate overrides and verification limits.
- [x] Verify final release archive in an isolated directory without node_modules.

## Deployment handoff

- [ ] Install on the intended Paperclip server and check a real company's usage. No running local Paperclip server was found; no live deployment or npm publication has occurred.

## Monthly comparison refinement

- [x] Use calendar months throughout the audit and dashboard.
- [x] Simplify the calculator to a monthly subscription price.
- [x] Test month-to-date, completed months, leap years and incomplete coverage.

## Five-provider monthly costs

- [x] Add five provider cost slots and match records by provider/model.
- [x] Blend weighted monthly fees into the task audit, retaining unallocated costs.
- [x] Test matching, mixed-provider allocations and company/month persistence.
- [x] Verify rendered fee totals and persistence across a browser reload.

## Repository handoff

- [x] Add reproducible Node/pnpm versions, GitHub CI and Mac mini instructions.
- [ ] Push private StartupMill/token-clip repository and verify clean-checkout CI.
- [ ] Run live acceptance checks on the Mac mini (user handoff).
