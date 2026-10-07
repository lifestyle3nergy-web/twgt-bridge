import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const LOCAL = join(ROOT, "lib", "reason-codes.json");

const CANONICAL = process.env.TWGT_SCHEMA_GATE_PATH
  ? join(process.env.TWGT_SCHEMA_GATE_PATH, "schemas", "v1", "common", "evidence-reason-code.json")
  : null;

test("local reason-codes.json parses and has the expected shape", () => {
  const doc = JSON.parse(readFileSync(LOCAL, "utf8"));
  assert.ok(Array.isArray(doc.codes), "codes must be an array");
  assert.ok(doc.codes.length > 0, "codes must not be empty");
  for (const c of doc.codes) {
    assert.equal(typeof c, "string");
    assert.match(c, /^[A-Z][A-Z0-9_]*$/, `code ${c} must be SCREAMING_SNAKE_CASE`);
  }
});

test("local codes match twgt-schema-gate canonical enum", { skip: !CANONICAL }, () => {
  if (!CANONICAL) {
    // TWGT_SCHEMA_GATE_PATH not set. In CI the env var is set by workflow.
    // A local run without the env var cannot verify the contract.
    // This does not fail — it records that the check did not run.
    console.error("[SKIP] TWGT_SCHEMA_GATE_PATH not set — contract check skipped");
    return;
  }
  if (!existsSync(CANONICAL)) {
    assert.fail(`canonical enum not found at ${CANONICAL}`);
  }
  const local = JSON.parse(readFileSync(LOCAL, "utf8")).codes.slice().sort();
  const canon = JSON.parse(readFileSync(CANONICAL, "utf8")).enum.slice().sort();

  const onlyLocal = local.filter((c) => !canon.includes(c));
  const onlyCanon = canon.filter((c) => !local.includes(c));

  assert.deepEqual(
    { onlyLocal, onlyCanon },
    { onlyLocal: [], onlyCanon: [] },
    `Reason code drift detected.\nOnly local: ${onlyLocal.join(", ") || "(none)"}\nOnly canonical: ${onlyCanon.join(", ") || "(none)"}`
  );
});
