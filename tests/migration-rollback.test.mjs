import { test } from "node:test";
import { strict as assert } from "node:assert";
import { checkSchemaVersion, evaluate, States } from "../lib/admission.mjs";

test("migration-rollback: unknown version forces HELD", () => {
  const ev = { bridge_version: "9.9.9" };
  const r = checkSchemaVersion(ev, ["0.1.0"]);
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, "UNSUPPORTED_SCHEMA_VERSION");
});

test("migration-rollback: missing version forces HELD", () => {
  assert.equal(checkSchemaVersion({}, ["0.1.0"]).state, States.HELD);
});

test("migration-rollback: supported version yields VALIDATED", () => {
  const ev = { bridge_version: "0.1.0" };
  assert.equal(checkSchemaVersion(ev, ["0.1.0"]).state, States.VALIDATED);
});

test("migration-rollback: evaluate() refuses old-schema evidence", () => {
  const now = new Date();
  const ev = { bridge_version: "0.0.1", collected_at: now.toISOString() };
  const r = evaluate({ evidence: ev, prior: { entries: [{}] }, now });
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, "UNSUPPORTED_SCHEMA_VERSION");
});
