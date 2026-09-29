# TWGT integration contract

## Role

`twgt-bridge` is the evidence pillar between the knowledge and governance repositories.

```text
engineering-intelligence  ->  twgt-schema-gate  ->  twgt-bridge
        why                         what                 prove
```

The bridge observes; it does not authorize, merge, or modify the systems it observes.

## Evidence boundary

A collection is tied to repository owner/name, default branch, exact HEAD SHA, collection timestamp, pull-request state and head SHAs, workflow-run status/conclusion and head SHA, and bridge version.

A verification is tied to a pinned commit and SHA256 digest for every pinned artifact.

## Admission states

`COLLECTED` means data was retrieved.

`VALIDATED` means an individual check passed.

`ADMITTED` means all required bridge checks passed.

`HELD` is the fail-closed result for missing baseline, stale evidence, unsupported bridge version, API/network failure, missing pin, or hash mismatch.

Evidence is never equivalent to production admission.

## Baseline rule

The first collection has no trustworthy prior baseline and therefore remains `HELD`. A later collection may become `ADMITTED` only after the previous evidence artifact is found, is parseable, and all current checks pass.

This prevents the collector from manufacturing its own baseline.

## Credential boundary

The GitHub token used for observation must have read-only access to the repositories it is authorised to inspect. The bridge itself has no GitHub write API path.

The workflow may use its repository-scoped `GITHUB_TOKEN` only to publish evidence to `twgt-bridge/evidence/auto`. That publication is an evidence artifact, not a write to the observed repositories.
