# twgt-bridge

**Read-only evidence collector. This repository writes nothing to any other repository. It has no merge authority. It runs on read-only credentials.**

The bridge is a governed collector for TWGT. It retrieves repository metadata, files, pull request metadata, commit metadata, and workflow run metadata from GitHub, and writes signed-by-SHA evidence records to a local directory. It does not create branches, does not commit to other repositories, does not open pull requests, and does not merge anything. There is no `file.put`. There is no `pr.merge`. Those capabilities are a separate, reviewed change with their own threat model, and they do not belong in a read-only collector.

## Why read-only first

A collector that can also write cannot prove that its reads are trustworthy, because it may have modified the thing it was reading. A collector that can only read is verifiable: the entire codebase can be audited in one sitting, and any future addition of a write capability becomes a visible violation of this document rather than a quiet expansion.

## What it collects

- Repository metadata (owner, name, default branch, visibility)
- Current HEAD SHA of the default branch
- The full recursive tree of the HEAD commit
- Pull request metadata (state, number, head SHA, base ref)
- Workflow run metadata (status, conclusion, event, head SHA, timestamps)
- Commit metadata for a given ref

## What it never does

- Never writes to any repository other than its own evidence directory
- Never uses a token with write scope
- Never commits evidence automatically — evidence is a local artifact until a human commits it via a reviewed PR
- Never schedules itself to run with elevated permissions

## Evidence format

Every evidence record is a JSON file containing:

- `bridge_version` — the version of this collector that produced the record
- `collected_at` — ISO 8601 UTC timestamp
- `source` — the repository and ref the record was derived from, including the exact SHA
- `payload` — the retrieved data

## Running


The token must have `Contents: read`, `Pull requests: read`, and `Actions: read`. It must not have any write scope.

## Tests

Four fail-closed tests. Each asserts that a specific failure condition produces `HELD`, not `PASS`.

## License

MIT — see `LICENSE`.
