#!/usr/bin/env node
// Verify a consuming repo's ADRs against the pinned central registry.
// GET-only. Fail-closed. Same shape as verify-registry.mjs.
//
// This module is a library. It is imported by consuming repos'
// scripts/validate-repository-contract.mjs. It has no CLI mode.

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

export const States = Object.freeze({ VALIDATED: "VALIDATED", HELD: "HELD" });

export const ReasonCode = Object.freeze({
  REGISTRY_MISSING: "REGISTRY_MISSING",
  REGISTRY_MALFORMED: "REGISTRY_MALFORMED",
  REGISTRY_HASH_MISMATCH: "REGISTRY_HASH_MISMATCH",
  PIN_MISSING: "PIN_MISSING",
  PIN_MALFORMED: "PIN_MALFORMED",
  ADR_NOT_IN_REGISTRY: "ADR_NOT_IN_REGISTRY",
  ADR_NUMBER_CONFLICT: "ADR_NUMBER_CONFLICT",
  ADR_REPO_MISMATCH: "ADR_REPO_MISMATCH",
  ADR_CONTENT_HASH_MISMATCH: "ADR_CONTENT_HASH_MISMATCH",
  OK: "OK",
});

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

// Normalize ADR content before hashing: strip trailing whitespace per line,
// enforce LF line endings, single trailing newline.
export function normalizeAdr(content) {
  return (
    content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/, ""))
      .join("\n")
      .replace(/\n+$/, "") + "\n"
  );
}

export function adrContentHash(content) {
  return sha256(Buffer.from(normalizeAdr(content), "utf8"));
}

// Verify a single added ADR file against the registry.
//   registry: parsed adr-registry.json
//   repoSlug: "lifestyle3nergy-web/TWGT-"
//   filePath: "docs/adr/0016-static-outcome-library-...md"
//   fileContent: string
export function verifyAdrAgainstRegistry(registry, repoSlug, filePath, fileContent) {
  if (!registry || !Array.isArray(registry.allocated)) {
    return { state: States.HELD, reason: ReasonCode.REGISTRY_MALFORMED };
  }

  const m = filePath.match(/^docs\/adr\/(\d{4})-(.+)\.md$/);
  if (!m) {
    return { state: States.HELD, reason: ReasonCode.ADR_NOT_IN_REGISTRY, detail: { path: filePath } };
  }
  const [, number, slug] = m;

  const matches = registry.allocated.filter((e) => e.number === number);
  if (matches.length === 0) {
    return { state: States.HELD, reason: ReasonCode.ADR_NOT_IN_REGISTRY, detail: { number, path: filePath } };
  }
  if (matches.length > 1) {
    return { state: States.HELD, reason: ReasonCode.ADR_NUMBER_CONFLICT, detail: { number, count: matches.length } };
  }

  const entry = matches[0];
  if (entry.repo !== repoSlug) {
    return { state: States.HELD, reason: ReasonCode.ADR_REPO_MISMATCH, detail: { number, expected: entry.repo, actual: repoSlug } };
  }
  if (entry.slug !== slug) {
    return { state: States.HELD, reason: ReasonCode.ADR_NOT_IN_REGISTRY, detail: { number, expected_slug: entry.slug, actual_slug: slug } };
  }
  if (entry.content_sha256) {
    const actual = adrContentHash(fileContent);
    if (actual !== entry.content_sha256) {
      return { state: States.HELD, reason: ReasonCode.ADR_CONTENT_HASH_MISMATCH, detail: { number, expected: entry.content_sha256, actual } };
    }
  }
  return { state: States.VALIDATED, reason: ReasonCode.OK, detail: { number } };
}

// Verify the registry file itself against the pin.
export function verifyRegistryAgainstPin(registryBytes, pin) {
  if (!pin || !pin.registry_sha256) {
    return { state: States.HELD, reason: ReasonCode.PIN_MALFORMED };
  }
  const actual = sha256(registryBytes);
  if (actual !== pin.registry_sha256) {
    return { state: States.HELD, reason: ReasonCode.REGISTRY_HASH_MISMATCH, detail: { expected: pin.registry_sha256, actual } };
  }
  return { state: States.VALIDATED, reason: ReasonCode.OK };
}

// Read the local pin file. Convention: .twgt/adr-registry-pin.json
export function loadPin(pinPath) {
  if (!existsSync(pinPath)) {
    return { state: States.HELD, reason: ReasonCode.PIN_MISSING, detail: { path: pinPath } };
  }
  try {
    const pin = JSON.parse(readFileSync(pinPath, "utf8"));
    if (!pin.bridge_sha || !pin.registry_sha256) {
      return { state: States.HELD, reason: ReasonCode.PIN_MALFORMED, detail: { path: pinPath } };
    }
    return { state: States.VALIDATED, pin };
  } catch (e) {
    return {
      state: States.HELD,
      reason: ReasonCode.PIN_MALFORMED,
      detail: { path: pinPath, error: String(e.message || e) },
    };
  }
}
