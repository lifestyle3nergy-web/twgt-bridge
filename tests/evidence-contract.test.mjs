import assert from "node:assert/strict";
import test from "node:test";
import { validateEvidenceBatch } from "../lib/evidence-contract.mjs";

const valid = {
  decision: { state: "ADMITTED", reason: "ALL_CHECKS_PASSED", checks: [{ state: "VALIDATED", reason: "FRESH" }] },
  batch: {
    bridge_version: "0.1.0",
    collected_at: "2026-09-29T00:00:00Z",
    source: { owner: "lifestyle3nergy-web", repo: "twgt-schema-gate" },
    entries: [{ name: "repo-meta", ok: true, record: {} }]
  }
};

test("accepts evidence matching the published contract shape", () => {
  assert.deepEqual(validateEvidenceBatch(valid), { ok: true, errors: [] });
});

test("rejects malformed evidence", () => {
  const result = validateEvidenceBatch({ decision: { state: "ADMITTED", reason: "", checks: [] }, batch: { bridge_version: "x", collected_at: "x", source: { owner: "", repo: "" }, entries: [] } });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 6);
});
