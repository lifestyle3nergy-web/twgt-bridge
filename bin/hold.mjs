#!/usr/bin/env node
// twgt-bridge offline verifier. Read-only, no network.
// Usage: node bin/hold.mjs <evidence-file.json> [--max-age-seconds N]

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { evaluate, States } from "../lib/admission.mjs";

function usage() {
  console.error("usage: node bin/hold.mjs <evidence-file.json> [--max-age-seconds N]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const fileArg = args[0];
let maxAgeSeconds = 24 * 3600;
const ageFlagIdx = args.indexOf("--max-age-seconds");
if (ageFlagIdx !== -1 && args[ageFlagIdx + 1]) {
  const n = Number(args[ageFlagIdx + 1]);
  if (Number.isFinite(n) && n > 0) maxAgeSeconds = n;
}

const file = resolve(fileArg);
if (!existsSync(file)) {
  console.error(`[HELD] EVIDENCE_FILE_MISSING: ${file}`);
  process.exit(3);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`[HELD] EVIDENCE_PARSE_ERROR: ${String(e.message || e)}`);
  process.exit(3);
}

const batch = parsed.batch;
if (!batch || !Array.isArray(batch.entries)) {
  console.error("[HELD] EVIDENCE_MALFORMED: missing batch.entries");
  process.exit(3);
}

const apiError = batch.entries.find(e => e && e.ok === false) || null;
const decision = evaluate({
  evidence: batch,
  prior: { entries: batch.entries },
  apiError,
  maxAgeSeconds,
});

console.log(JSON.stringify(decision, null, 2));
process.exit(decision.state === States.EVIDENCE_READY ? 0 : 1);
