import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluate } from "../../lib/admission.mjs";
import { makeEvidenceManifest, EVIDENCE_VERSION } from "../../lib/evidence.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const LOCAL = join(ROOT, "lib", "evidence-record.schema.json");

const CANONICAL = process.env.TWGT_SCHEMA_GATE_PATH
  ? join(process.env.TWGT_SCHEMA_GATE_PATH, "schemas", "v1", "common", "evidence-record.json")
  : null;

test("vendored schema parses and declares the three top-level parts", () => {
  const schema = JSON.parse(readFileSync(LOCAL, "utf8"));
  assert.equal(schema.type, "object");
  assert.deepEqual(
    [...schema.required].sort(),
    ["batch", "decision", "manifest"]
  );
  // decision is a $ref, not a duplicated definition
  assert.equal(schema.properties.decision.$ref, "evaluation-record.json");
});

test("vendored schema declares manifest as tamper-evident", () => {
  const schema = JSON.parse(readFileSync(LOCAL, "utf8"));
  const manifest = schema.properties.manifest;
  assert.ok(manifest.required.includes("payload_hash"));
  assert.ok(manifest.required.includes("entry_count"));
  assert.equal(
    manifest.properties.evidence_version.const,
    "1.0.0"
  );
  assert.equal(
    manifest.properties.payload_hash.pattern,
    "^sha256:[0-9a-f]{64}$"
  );
});

test("vendored schema matches canonical when TWGT_SCHEMA_GATE_PATH set", { skip: !CANONICAL }, () => {
  if (!CANONICAL) return;
  if (!existsSync(CANONICAL)) {
    assert.fail(`canonical schema not found at ${CANONICAL}`);
  }
  const local = JSON.parse(readFileSync(LOCAL, "utf8"));
  const canon = JSON.parse(readFileSync(CANONICAL, "utf8"));
  assert.equal(local.$id, canon.$id);
  assert.equal(local.title, canon.title);
  assert.deepEqual(
    [...local.required].sort(),
    [...canon.required].sort()
  );
  assert.deepEqual(
    Object.keys(local.properties).sort(),
    Object.keys(canon.properties).sort()
  );
});

test("collect.mjs document shape matches the schema", () => {
  const now = new Date();
  const batch = {
    bridge_version: "0.1.0",
    collected_at: now.toISOString(),
    source: { owner: "lifestyle3nergy-web", repo: "twgt-schema-gate" },
    entries: [{ name: "repo-meta", ok: true, record: {} }],
  };
  const decision = evaluate({
    evidence: batch,
    prior: { entries: batch.entries },
    apiError: null,
    now,
  });
  const manifest = makeEvidenceManifest(batch, decision);
  const doc = { decision, batch, manifest };

  // Top level
  assert.deepEqual(Object.keys(doc).sort(), ["batch", "decision", "manifest"]);

  // decision shape (from evaluation-record.json)
  assert.ok(["EVIDENCE_READY", "HELD"].includes(doc.decision.state));
  assert.equal(typeof doc.decision.reason, "string");
  assert.ok(Array.isArray(doc.decision.checks));
  assert.ok(doc.decision.checks.length >= 1);

  // batch shape
  assert.equal(typeof doc.batch.bridge_version, "string");
  assert.equal(typeof doc.batch.collected_at, "string");
  assert.equal(typeof doc.batch.source.owner, "string");
  assert.equal(typeof doc.batch.source.repo, "string");
  assert.ok(Array.isArray(doc.batch.entries));
  assert.ok(doc.batch.entries.length >= 1);
  for (const e of doc.batch.entries) {
    assert.equal(typeof e.name, "string");
    assert.equal(typeof e.ok, "boolean");
  }

  // manifest shape
  assert.equal(doc.manifest.evidence_version, "1.0.0");
  assert.equal(doc.manifest.evidence_version, EVIDENCE_VERSION);
  assert.equal(typeof doc.manifest.bridge_version, "string");
  assert.equal(typeof doc.manifest.collected_at, "string");
  assert.equal(typeof doc.manifest.source.owner, "string");
  assert.equal(typeof doc.manifest.source.repo, "string");
  assert.ok(["EVIDENCE_READY", "HELD"].includes(doc.manifest.decision.state));
  assert.equal(typeof doc.manifest.decision.reason, "string");
  assert.match(doc.manifest.payload_hash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(typeof doc.manifest.entry_count, "integer".replace("integer","number"));
  assert.equal(doc.manifest.entry_count, doc.batch.entries.length);
});

test("bridge never emits an ADMITTED state inside an evidence record", () => {
  const now = new Date();
  const batch = {
    bridge_version: "0.1.0",
    collected_at: now.toISOString(),
    source: { owner: "lifestyle3nergy-web", repo: "twgt-schema-gate" },
    entries: [{ name: "repo-meta", ok: true, record: {} }],
  };
  const decision = evaluate({
    evidence: batch,
    prior: { entries: batch.entries },
    apiError: null,
    now,
  });
  const manifest = makeEvidenceManifest(batch, decision);
  const doc = { decision, batch, manifest };
  assert.notEqual(doc.decision.state, "ADMITTED");
  assert.notEqual(doc.manifest.decision.state, "ADMITTED");
});
