# twgt-bridge

Read-only evidence collector. No merge authority.

The bridge retrieves repository and workflow evidence and writes evidence records only to its own evidence/auto branch. It never writes to another repository.

## Contract boundary

twgt-schema-gate publishes the canonical machine-checkable contracts. This repository pins the exact schema commit and SHA256 for every registered schema.

Before evidence is admitted:
1. the pinned schema files must hash-match;
2. the evidence batch must satisfy the local fail-closed structural guard;
3. the admission checks must pass.

The structural guard is deliberately narrow and defensive. The pinned schema remains the canonical contract; changing it requires a reviewed pin update.

## Security boundary

The GitHub read token is read-only against source repositories. The bridge workflow token may write only its evidence/auto branch.