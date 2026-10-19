#!/usr/bin/env node
// twgt-bridge CLI. Read-only.
// Usage: GITHUB_TOKEN=<token> node bin/collect.mjs <owner>/<repo> [out-dir]

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  makeClient,
  collectRepoMeta,
  collectPulls,
  collectWorkflowRuns,
  CollectorError,
  BRIDGE_VERSION,
} from "../lib/collector.mjs";
import { evaluate, States } from "../lib/admission.mjs";
import { makeEvidenceManifest } from "../lib/evidence.mjs";

function usage() {
  console.error("usage: GITHUB_TOKEN=<token> node bin/collect.mjs <owner>/<repo> [out-dir]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();
const [slug, outDirArg] = args;
if (!slug.includes("/")) usage();
const [owner, repo] = slug.split("/");
const outDir = resolve(outDirArg || join(process.cwd(), "evidence"));

const token = process.env.GITHUB_TOKEN;
let client;
try {
  client = makeClient(token);
} catch (e) {
  console.error(`[HELD] ${e.code}: ${e.message}`);
  process.exit(3);
}

const collectedAt = new Date().toISOString();
const stamp = collectedAt.replace(/[:.]/g, "-");
const batch = {
  bridge_version: BRIDGE_VERSION,
  collected_at: collectedAt,
  source: { owner, repo },
  entries: [],
};
let apiError = null;

async function step(name, fn) {
  try {
    const record = await fn();
    batch.entries.push({ name, ok: true, record });
    console.log(`[ OK ] ${name}`);
  } catch (e) {
    if (e instanceof CollectorError) {
      apiError = e;
      batch.entries.push({ name, ok: false, error: { code: e.code, message: e.message, detail: e.detail } });
      console.log(`[FAIL] ${name}: ${e.code} ${e.message}`);
    } else {
      throw e;
    }
  }
}

await step("repo-meta", () => collectRepoMeta(client, owner, repo));
await step("pulls", () => collectPulls(client, owner, repo));
await step("workflow-runs", () => collectWorkflowRuns(client, owner, repo));

const decision = evaluate({ evidence: batch, prior: { entries: batch.entries }, apiError });
console.log(`[${decision.state}] ${decision.reason}`);

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${owner}-${repo}-${stamp}.json`);
const manifest = makeEvidenceManifest(batch, decision);
writeFileSync(outFile, JSON.stringify({ decision, batch, manifest }, null, 2));
console.log(`wrote ${outFile}`);

process.exit(decision.state === States.EVIDENCE_READY ? 0 : 1);
