# Publication doctrine — OPEN DECISION

**Status: OPEN — human decision required before merge.**

`README.md` and `AGENTS.md` currently describe incompatible models of what the bridge is permitted to do. This document names the contradiction. It does not resolve it.

## Contradiction

| Claim | README says | AGENTS.md says |
|---|---|---|
| Uses a token with write scope | "Never uses a token with write scope" | "`contents: write` only so that the built-in `GITHUB_TOKEN` can push to `evidence/auto` within this repo" |
| Auto-commits evidence | "Never commits evidence automatically" | "publishes the resulting evidence to the branch `evidence/auto`" |
| Evidence destination | "local artifact until a human commits it via a reviewed PR" | scheduled auto-publish to `evidence/auto` |

## Model A — read-only collector (README's model)

- Bridge uses `READ_TOKEN` only.
- Evidence uploaded as workflow artifact; publication via separate human-triggered workflow.
- `contents: write` removed from `harvest.yml`.

**Cost:** requires a new publish workflow. **Benefit:** preserves README's stated rationale ("a collector that can also write cannot prove that its reads are trustworthy").

## Model B — scoped publisher (AGENTS.md's model)

- Bridge collects with `READ_TOKEN`, publishes with repository-scoped `GITHUB_TOKEN`.
- Writes constrained to `evidence/auto` only.
- Publication automatic on schedule.

**Cost:** requires CODEOWNERS on `evidence/auto`, honest README. **Benefit:** no extra workflow.

## Decision

- [ ] **Model A** — remove auto-publish; publish step becomes human-triggered
- [ ] **Model B** — keep auto-publish; update README to match AGENTS.md
- [ ] **Defer** — freeze current workflow as-is pending further review

**Authorized by:** _______________ **Date:** _______________

## Consequence of merge without decision

Until this decision exists, PR #18 is the only bridge change that is safe to merge — it fixes two defects without choosing between models.
