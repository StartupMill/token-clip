# Test Token Clip on the Mac mini

The repository is private. Authenticate GitHub CLI on the Mac mini with an account that can access `StartupMill/token-clip`.

## Clone and verify

```sh
gh repo clone StartupMill/token-clip
cd token-clip
nvm install
nvm use
npm install --global pnpm@9.15.4
pnpm install --frozen-lockfile
pnpm check
pnpm validate:package
pnpm smoke:worker
```

`nvm` is optional: if Node 26.8.1 is already installed, skip those two commands. The SDK archives are included in `vendor/`; no private package registry is required. `pnpm check` runs the tests and builds `dist/`.

## Install into Paperclip

Keep the checkout in a permanent location on the Mac mini. The Paperclip server process must be able to read that location. Run from the repository root:

```sh
paperclipai plugin install "$PWD" --local --api-base http://localhost:3100
paperclipai plugin health paperclip.token-clip --api-base http://localhost:3100
```

Use your actual Paperclip URL/port instead of the example. The Paperclip CLI must already be installed and authenticated for that instance. This is a local plugin install, not an npm publication. Requirements and host compatibility are listed in the README. If an earlier Token Clip is already installed, use the host's plugin upgrade flow instead of creating a duplicate.

## Acceptance check

1. Select the intended company. Confirm **Token spend** on the dashboard and **Token audit** in the sidebar.
2. Select a month with real usage. Check one task's run records against Paperclip's own ledger and export the raw CSV.
3. Enter monthly costs for used providers. Blank means not configured; 0 means explicitly free. Inputs stay in that browser for that company/month, not in Git or on the server.
4. Confirm a task using multiple providers shows a combined allocated subscription cost. Unpriced models must remain flagged; add verified exact model rates in company plugin settings as needed.
5. Confirm an unused provider's monthly fee is shown as unallocated. Current-month allocations change as more usage arrives.

The plugin only reads the host ledger. It does not launch agents or change tasks. Real usage verification on the Mac mini is still required; the local preview uses synthetic data.

## Update the checkout

```sh
git pull --ff-only
pnpm install --frozen-lockfile
pnpm check
```

Then reload/upgrade the plugin through Paperclip so the worker and UI use the rebuilt output. Avoid deleting or moving the directory while the plugin is installed.

To view the synthetic preview separately, run `pnpm preview --port 4179` and open `http://127.0.0.1:4179/` on the Mac mini.
