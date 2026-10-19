import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const GATE_PATH = process.env.TWGT_SCHEMA_GATE_PATH;
const FIXTURES_DIR = GATE_PATH ? join(GATE_PATH, "contract-tests", "fixtures") : null;
const SCHEMA_PATH = join(process.cwd(), "lib", "evidence-record.schema.json");

let validate = null;
if (GATE_PATH && existsSync(GATE_PATH)) {
  try {
    const mod = await import(pathToFileURL(join(GATE_PATH, "contract-tests", "lib", "jsonschema-mini.mjs")).href);
    validate = mod.validate;
  } catch (e) {
    console.warn("Could not load validator from schema-gate:", e.message);
  }
}

test("bridge schema accepts canonical valid evidence fixture", { skip: !FIXTURES_DIR || !validate }, () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const fx = join(FIXTURES_DIR, "evidence-record-valid.json");
  if (!existsSync(fx)) assert.fail("Missing valid fixture");
  const data = JSON.parse(readFileSync(fx, "utf8"));
  const errors = validate(schema, data);
  assert.equal(errors.length, 0, `Should accept valid fixture: ${JSON.stringify(errors)}`);
});

test("bridge schema rejects canonical invalid evidence fixture", { skip: !FIXTURES_DIR || !validate }, () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const fx = join(FIXTURES_DIR, "evidence-record-invalid.json");
  if (!existsSync(fx)) assert.fail("Missing invalid fixture");
  const data = JSON.parse(readFileSync(fx, "utf8"));
  const errors = validate(schema, data);
  assert.ok(errors.length > 0, "Should reject invalid fixture");
});
