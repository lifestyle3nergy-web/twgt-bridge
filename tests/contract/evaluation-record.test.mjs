import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluate, States } from "../../lib/admission.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const LOCAL = join(ROOT, "lib", "evaluation-record.schema.json");

const CANONICAL = process.env.TWGT_SCHEMA_GATE_PATH
  ? join(process.env.TWGT_SCHEMA_GATE_PATH, "schemas", "v1", "common", "evaluation-record.json")
  : null;

test("local evaluation-record schema parses and has required shape", () => {
  const schema = JSON.parse(readFileSync(LOCAL, "utf8"));
  assert.equal(schema.type, "object");
  assert.deepEqual(
    [...schema.required].sort(),
    ["checks", "reason", "state"]
  );
  assert.deepEqual(
    [...schema.properties.state.enum].sort(),
    ["EVIDENCE_READY", "HELD"]
  );
});

test("local schema matches canonical when TWGT_SCHEMA_GATE_PATH set", { skip: !CANONICAL }, () => {
  if (!CANONICAL) {
    console.error("[SKIP] TWGT_SCHEMA_GATE_PATH not set");
    return;
  }
  if (!existsSync(CANONICAL)) {
    assert.fail(`canonical schema not found at ${CANONICAL}`);
  }
  const local = JSON.parse(readFileSync(LOCAL, "utf8"));
  const canon = JSON.parse(readFileSync(CANONICAL, "utf8"));

  assert.equal(local.$id, canon.$id, "$id must match");
  assert.equal(local.title, canon.title, "title must match");
  assert.deepEqual(
    [...local.required].sort(),
    [...canon.required].sort(),
    "required fields must match"
  );
  assert.deepEqual(
    [...local.properties.state.enum].sort(),
    [...canon.properties.state.enum].sort(),
    "state enum must match"
  );
});

test("evaluate() output validates against the vendored schema shape", () => {
  const now = new Date();
  const batch = {
    bridge_version: "0.1.0",
    collected_at: now.toISOString(),
    source: { owner: "lifestyle3nergy-web", repo: "twgt-schema-gate" },
    entries: [{ name: "repo-meta", ok: true, record: {} }],
  };
  const result = evaluate({
    evidence: batch,
    prior: { entries: batch.entries },
    apiError: null,
    now,
  });

  // Required fields present
  assert.ok("state" in result, "state required");
  assert.ok("reason" in result, "reason required");
  assert.ok("checks" in result, "checks required");

  // State is one of the allowed enum values
  assert.ok(
    ["EVIDENCE_READY", "HELD"].includes(result.state),
    `state must be EVIDENCE_READY or HELD, got ${result.state}`
  );

  // Checks is a non-empty array of { state, reason }
  assert.ok(Array.isArray(result.checks));
  assert.ok(result.checks.length >= 1);
  for (const c of result.checks) {
    assert.ok(["VALIDATED", "HELD"].includes(c.state));
    assert.equal(typeof c.reason, "string");
  }

  // Cross-check: bridge never returns ADMITTED
  assert.notEqual(result.state, "ADMITTED");
});

test("State enum on the schema and on the runtime agree", () => {
  const schema = JSON.parse(readFileSync(LOCAL, "utf8"));
  const allowed = new Set(schema.properties.state.enum);
  for (const s of [States.EVIDENCE_READY, States.HELD]) {
    assert.ok(allowed.has(s), `bridge state ${s} must be in schema enum`);
  }
});
