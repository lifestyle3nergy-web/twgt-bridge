import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  verifyAdrAgainstRegistry,
  verifyRegistryAgainstPin,
  adrContentHash,
  States,
  ReasonCode,
} from "../bin/verify-adr-registry.mjs";

const REGISTRY = {
  registry_version: "1.0.0",
  updated_at: "2026-10-17T00:00:00Z",
  next_number: "0019",
  allocated: [
    { number: "0014", slug: "versioned-admission-contract-schemas",
      repo: "lifestyle3nergy-web/TWGT-", pr: 119, merged_at: null,
      status: "proposed", evidence_class: "ACTION",
      content_sha256: null, supersedes: [], superseded_by: null },
  ],
};
const REPO = "lifestyle3nergy-web/TWGT-";

test("verify: missing registry forces HELD", () => {
  const r = verifyAdrAgainstRegistry(null, REPO, "docs/adr/0014-x.md", "");
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, ReasonCode.REGISTRY_MALFORMED);
});

test("verify: empty allocated array forces HELD", () => {
  const r = verifyAdrAgainstRegistry({ allocated: [] }, REPO, "docs/adr/0014-x.md", "");
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, ReasonCode.ADR_NOT_IN_REGISTRY);
});

test("verify: number not in registry forces HELD", () => {
  const r = verifyAdrAgainstRegistry(REGISTRY, REPO, "docs/adr/0099-x.md", "");
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, ReasonCode.ADR_NOT_IN_REGISTRY);
});

test("verify: repo mismatch forces HELD", () => {
  const r = verifyAdrAgainstRegistry(
    REGISTRY,
    "lifestyle3nergy-web/other",
    "docs/adr/0014-versioned-admission-contract-schemas.md",
    "",
  );
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, ReasonCode.ADR_REPO_MISMATCH);
});

test("verify: slug mismatch forces HELD", () => {
  const r = verifyAdrAgainstRegistry(
    REGISTRY,
    REPO,
    "docs/adr/0014-wrong-slug.md",
    "",
  );
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, ReasonCode.ADR_NOT_IN_REGISTRY);
});

test("verify: matching entry with no hash yields VALIDATED", () => {
  const r = verifyAdrAgainstRegistry(
    REGISTRY,
    REPO,
    "docs/adr/0014-versioned-admission-contract-schemas.md",
    "any content",
  );
  assert.equal(r.state, States.VALIDATED);
});

test("verify: content hash mismatch forces HELD", () => {
  const registry = {
    ...REGISTRY,
    allocated: [{ ...REGISTRY.allocated[0], content_sha256: "0".repeat(64) }],
  };
  const r = verifyAdrAgainstRegistry(
    registry,
    REPO,
    "docs/adr/0014-versioned-admission-contract-schemas.md",
    "content",
  );
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, ReasonCode.ADR_CONTENT_HASH_MISMATCH);
});

test("verify: registry pin hash mismatch forces HELD", () => {
  const r = verifyRegistryAgainstPin(Buffer.from("abc"), {
    registry_sha256: "0".repeat(64),
  });
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, ReasonCode.REGISTRY_HASH_MISMATCH);
});

test("verify: normalize strips trailing whitespace and enforces LF", () => {
  const a = adrContentHash("# ADR-0014\r\ncontent   \r\n");
  const b = adrContentHash("# ADR-0014\ncontent\n");
  assert.equal(a, b);
});
