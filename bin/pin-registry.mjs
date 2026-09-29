#!/usr/bin/env node
// Local pin generator. Reads a TRUSTED local checkout of twgt-schema-gate
// at a specific commit and writes pins/twgt-schema-gate.json.
// Run this by hand. Review the pin in a PR. Do not automate.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

function usage() {
  console.error("usage: node bin/pin-registry.mjs <local-repo-path> <sha> [out-file]");
  console.error("  e.g. node bin/pin-registry.mjs ~/twgt-schema-gate 93fcb3b pins/twgt-schema-gate.json");
  process.exit(2);
}

const [repoPath, sha, outFileArg] = process.argv.slice(2);
if (!repoPath || !sha) usage();

const REPO = resolve(repoPath);
if (!existsSync(join(REPO, ".git"))) {
  console.error(`[HELD] NOT_A_GIT_REPO: ${REPO}`);
  process.exit(3);
}

// Verify the local checkout is actually at the claimed SHA.
let actualSha;
try {
  actualSha = execSync(`git -C ${JSON.stringify(REPO)} rev-parse ${JSON.stringify(sha)}`, { encoding: "utf8" }).trim();
} catch (e) {
  console.error(`[HELD] SHA_NOT_FOUND: ${sha}`);
  process.exit(3);
}
if (!actualSha.startsWith(sha) && actualSha !== sha) {
  console.error(`[HELD] SHA_MISMATCH: requested ${sha}, got ${actualSha}`);
  process.exit(3);
}

// Refuse to pin if the working tree is dirty. The pin must describe a commit, not a scratch state.
const dirty = execSync(`git -C ${JSON.stringify(REPO)} status --porcelain`, { encoding: "utf8" }).trim();
if (dirty.length > 0) {
  console.error(`[HELD] WORKTREE_DIRTY: commit or stash first`);
  process.exit(3);
}

const schemasDir = join(REPO, "schemas");
if (!existsSync(schemasDir)) {
  console.error(`[HELD] SCHEMAS_DIR_MISSING: ${schemasDir}`);
  process.exit(3);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

const files = walk(schemasDir).sort();
const schemas = {};
for (const f of files) {
  const rel = relative(REPO, f).replace(/\\/g, "/");
  schemas[rel] = sha256(readFileSync(f));
}

const registryPath = join(schemasDir, "registry.json");
if (!existsSync(registryPath)) {
  console.error(`[HELD] REGISTRY_MISSING: ${registryPath}`);
  process.exit(3);
}

const pin = {
  repo: "lifestyle3nergy-web/twgt-schema-gate",
  ref: "refs/heads/main",
  pinned_sha: actualSha,
  pinned_at: new Date().toISOString(),
  registry_sha256: sha256(readFileSync(registryPath)),
  schemas,
};

const outFile = resolve(outFileArg || join(process.cwd(), "pins/twgt-schema-gate.json"));
mkdirSync(join(outFile, ".."), { recursive: true });
writeFileSync(outFile, JSON.stringify(pin, null, 2) + "\n");
console.log(`wrote ${outFile}`);
console.log(`pinned_sha: ${actualSha}`);
console.log(`files: ${files.length}`);
