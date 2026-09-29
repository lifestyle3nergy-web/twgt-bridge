# Agents

This file documents every automated agent that interacts with this repository, the credential each one uses, and the actions each one is forbidden from taking. It is the governance layer for agent access. It contains no credentials and never will — credentials live in repository secrets, and the README is the contract those secrets exist to enforce.

## Read-only agents

### `harvest`

- **Location**: `.github/workflows/harvest.yml`
- **Trigger**: cron every 6 hours, plus manual dispatch
- **Credential**: `READ_TOKEN` — a fine-grained PAT scoped to `lifestyle3nergy-web/twgt-schema-gate` only. Permissions: Actions read, Contents read, Metadata read, Pull requests read. No write scope of any kind.
- **Does**: runs `bin/collect.mjs` against `twgt-schema-gate`, runs `bin/verify-all.mjs` against every pin in `pins/`, and publishes the resulting evidence to the branch `evidence/auto`.
- **Forbidden from**: writing to `main`, writing to any branch other than `evidence/auto`, writing to any repository other than `twgt-bridge`, using a token with write scope, calling a non-GET GitHub API method.
- **Enforcement**: the `READ_TOKEN` cannot write. Even if the workflow code attempted a write, GitHub would return 403. The workflow declares `permissions: contents: write` only so that the built-in `GITHUB_TOKEN` can push to `evidence/auto` within this repo.

## Offline tools

### `bin/pin-registry.mjs`

- **Location**: `bin/pin-registry.mjs`
- **Trigger**: manual, by a human
- **Credential**: none. Reads a trusted local checkout.
- **Does**: writes `pins/twgt-schema-gate.json` with SHA256 hashes of every schema at a specific commit.
- **Forbidden from**: running in CI. The pin is a reviewed human act.

### `bin/verify-registry.mjs` and `bin/verify-all.mjs`

- **Location**: `bin/`
- **Trigger**: manual, or called by `harvest`
- **Credential**: `GITHUB_TOKEN` (read-only in CI)
- **Does**: fetches pinned files and compares SHA256.
- **Forbidden from**: any write.

### `bin/hold.mjs`

- **Location**: `bin/hold.mjs`
- **Trigger**: manual
- **Credential**: none. Fully offline.
- **Does**: re-runs the four admission checks against an evidence file already on disk.
- **Forbidden from**: any network call.

## Not present in this repository

No agent in `twgt-bridge` can:

- Create a branch on any repository other than `twgt-bridge`
- Commit to any branch other than `evidence/auto`
- Open, comment on, approve, or merge a pull request
- Delete a branch
- Modify a ruleset, branch protection, or repository settings
- Rotate or read a secret

Any change that adds one of the above to any agent is a change to this file. It must be a reviewed PR with a new threat model. It cannot be a silent expansion.

## Adding a new agent

Open a PR that:

1. Adds the agent to this file with its credential, scope, and prohibitions
2. Adds the corresponding pin or token as a repository secret
3. Adds a fail-closed test that proves the agent returns HELD on the failure mode it exists to catch
4. States, in the PR description, what the agent cannot do

If any of those four items is missing, the PR does not merge.
