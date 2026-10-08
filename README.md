# Token Clip

A Paperclip plugin that answers: **How many tokens did each task use, and what would that usage cost at API rates?**

By Toby Allen / [StartupMill](https://startupmill.co). MIT. Package: `@startupmill/paperclip-plugin-token-clip`. Plugin ID: `paperclip.token-clip`.

## Included

- A dashboard card with month-to-date token activity, API base estimate, recorded costs and an audit link.
- A company-scoped task audit with UTC calendar months, search, model filter, sorting and pagination.
- Per-task usage record details: agent, model, status, billing type, uncached input, cached input, output, recorded cost and API estimate. Failed runs and retries remain included.
- A full CSV audit with event/run/task IDs, raw counters, applied model rates, sources and caveats. Exports are independent of task table filters.
- A monthly subscription comparison against the API base value of Paperclip usage. Current months show usage so far; incomplete coverage does not produce a cost verdict. Five cost slots cover GPT/OpenAI, Claude, xAI/Grok, Google Gemini and a custom provider. Each provider’s fee is allocated to tasks by their share of its API-equivalent usage, then blended across providers. Amounts are remembered in this browser per company/month.
- Exact model-rate overrides in company plugin settings. Unknown models stay visibly unpriced.

## Install

For a fresh checkout on the Mac mini, follow the [Mac mini setup and acceptance guide](docs/mac-mini.md). Source: [StartupMill/token-clip](https://github.com/StartupMill/token-clip).

Requires Node 24.11+ and a Paperclip host with plugin API v1, dashboard widgets, company-scoped config, managed database namespaces and core table reads. The included SDK is pinned at 1.0.0, shared at 0.3.1. Paperclip's plugin API is evolving; older hosts without `cached_input_tokens`, `cost_status`, `billing_type` or `issue_id` on `cost_events` are not compatible.

The archive is prepared locally, **not published to npm**. On the Paperclip server machine, extract it to a permanent directory:

```sh
mkdir -p token-clip
tar -xzf startupmill-paperclip-plugin-token-clip-0.1.0.tgz -C token-clip --strip-components=1
paperclipai plugin install "$PWD/token-clip" --local --api-base http://localhost:3100
paperclipai plugin health paperclip.token-clip --api-base http://localhost:3100
```

Replace the example API base with your actual instance. The directory must be readable by that server. Managed/cloud instances may disallow local packages. The worker is bundled; React and the UI SDK are supplied by the host. No provider credentials or additional database connection is needed.

For a server running on the same machine as the checkout, install the checkout’s absolute path after `pnpm build`.

Once enabled, select a company: **Token spend** appears on the dashboard and **Token audit** in the sidebar. Existing retained ledger history is immediately available. No backfill job is needed. New usage appears after Paperclip records it; the visible audit refreshes every 30 seconds.

## Interpret the figures

**Recorded by Paperclip** is the sum of the host's cost ledger, not an invoice. Subscription runs often record $0. Subscriptions, hosting, taxes and other charges need to be included in your comparison input. Allocate the portion of a shared subscription attributable to the selected period and work; do not compare a full monthly fee to an arbitrary partial period without accounting for that difference.

**API base estimate** uses configured USD rates per million tokens. It is an estimate for the observed usage, not a prediction that another model/system would use the same number of tokens. Unknown models are excluded and labelled. A partial estimate cannot establish total savings.

Token conventions differ. OpenAI input includes cache hits, so cached input is subtracted before pricing regular input. Anthropic's normalized Paperclip input excludes cache hits; the two buckets are added. Other providers need an explicit rate with a cache convention. Negative/nonintegral counts and cached counts above inclusive input are treated as unknown.

The ledger does not always preserve cache-write duration, per-request context length, mixed-model breakdown or service tier. Cache-write premiums, long-context premiums, routing, tool charges and tier modifiers are excluded. Claude's normalized input can include cache creation priced here at base input rate. See [accounting notes](docs/accounting.md).

## Rates

Built-in rates are a snapshot verified on **2026-10-08**, using the official [OpenAI pricing table](https://developers.openai.com/api/docs/pricing), [GPT-5.4 model page](https://developers.openai.com/api/docs/models/gpt-5.4) and [Anthropic pricing table](https://platform.claude.com/docs/en/about-claude/pricing). Eight exact models are included: GPT-6 Astra, GPT-6.1 Sol, GPT-6 Luna, GPT-5.6 Sol, GPT-5.4, GPT-5.3 Codex, Claude Sonnet 4.6 and Claude Opus 4.6. Rate sources and verification dates are visible in the audit. No model-prefix guessing is used.

In company plugin settings, supply `rates` entries to add or override exact provider/model pairs:

```json
{
  "rates": [
    {
      "provider": "openai",
      "model": "gpt-5.4",
      "input": 2.5,
      "cached": 0.25,
      "output": 15,
      "inputIncludesCache": true,
      "source": "https://developers.openai.com/api/docs/models/gpt-5.4",
      "verified": "2026-10-08"
    }
  ]
}
```

All rates are USD per million tokens. New configurations reprice the selected historical period. Export CSV to preserve the specific rate snapshot used for an audit. This is not a historical-tariff ledger.

## Development

Run these commands from the development checkout (which includes the pnpm lockfile).

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm smoke:worker
pnpm preview --port 4179
npm pack
```

`pnpm preview` shows an explicitly labelled illustrative dataset. The production plugin never substitutes sample data for a failed or empty query. `pnpm preview:build` produces a standalone preview in `preview-dist/`; it is separate from plugin output.

Tests cover accounting, PostgreSQL pagination and company boundaries, SDK registration, UI interactions and empty/error states. The archive smoke script also runs an extracted bundle without `node_modules` and checks authenticated company-scope overriding. See [verification](docs/verification.md).

No external requests, task mutation, agent wake-ups, filesystem scanning or telemetry are performed by the plugin. Disabling/uninstalling it does not affect the host's ledger.
