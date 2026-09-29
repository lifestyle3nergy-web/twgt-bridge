#!/usr/bin/env node
// Verify every pin file in pins/ and return a single combined decision.
// One HELD anywhere -> overall HELD. Fail-closed.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { verifyAll, makeFetcher } from "./verify-registry.mjs";

const PINS_DIR = resolve(process.argv[2] || "pins");

if (!existsSync(PINS_DIR)) {
  console.error(`[HELD] PINS_DIR_MISSING: ${PINS_DIR}`);
  process.exit(3);
}

const pinFiles = readdirSync(PINS_DIR)
  .filter(f => f.endsWith(".json"))
  .sort();

if (pinFiles.length === 0) {
  console.error(`[HELD] NO_PIN_FILES: ${PINS_DIR}`);
  process.exit(3);
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("[HELD] GITHUB_TOKEN not set");
  process.exit(3);
}

const results = [];
for (const name of pinFiles) {
  const full = join(PINS_DIR, name);
  let pin;
  try {
    pin = JSON.parse(readFileSync(full, "utf8"));
  } catch (e) {
    results.push({ pin: name, state: "HELD", reason: "PARSE_ERROR", detail: String(e.message || e) });
    continue;
  }
  if (!pin.repo || !pin.pinned_sha || !pin.schemas) {
    results.push({ pin: name, state: "HELD", reason: "PIN_MALFORMED" });
    continue;
  }
  const [owner, repo] = pin.repo.split("/");
  const fetcher = makeFetcher(token, owner, repo, pin.pinned_sha);
  try {
    const r = await verifyAll(pin, fetcher);
    results.push({
      pin: name,
      repo: pin.repo,
      pinned_sha: pin.pinned_sha,
      state: r.state,
      total: r.total,
      passed: r.passed,
      failed: r.failed,
    });
  } catch (e) {
    results.push({ pin: name, state: "HELD", reason: "VERIFIER_THREW", detail: String(e.message || e) });
  }
}

const anyHeld = results.some(r => r.state === "HELD");
const combined = {
  state: anyHeld ? "HELD" : "ADMITTED",
  pin_count: pinFiles.length,
  pinned_repos: results.map(r => r.repo || r.pin),
  results,
};

console.log(JSON.stringify(combined, null, 2));
process.exit(anyHeld ? 1 : 0);
