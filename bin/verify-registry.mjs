#!/usr/bin/env node
// Remote verifier. Reads pins/twgt-schema-gate.json, fetches every listed
// file from GitHub at the pinned SHA, and compares hashes. Fail-closed.

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const DEFAULT_PIN = "pins/twgt-schema-gate.json";

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function verifyPinnedFile(content, expectedHash) {
  const actual = sha256(content);
  if (actual !== expectedHash) {
    return { ok: false, reason: "HASH_MISMATCH", expected: expectedHash, actual };
  }
  return { ok: true, reason: "HASH_OK", actual };
}

export function verifyAll(pin, fetcher) {
  // fetcher(path) -> Promise<Buffer>, throws on network/API error.
  const results = [];
  const entries = Object.entries(pin.schemas);
  return (async () => {
    for (const [path, expected] of entries) {
      let buf;
      try {
        buf = await fetcher(path);
      } catch (e) {
        results.push({ path, ok: false, reason: "FETCH_ERROR", detail: String(e.message || e) });
        continue;
      }
      const r = verifyPinnedFile(buf, expected);
      results.push({ path, ...r });
    }
    const failed = results.filter(r => !r.ok);
    return {
      state: failed.length === 0 ? "ADMITTED" : "HELD",
      pinned_sha: pin.pinned_sha,
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      results,
    };
  })();
}

export function makeFetcher(token, owner, repo, sha) {
  if (!token) throw new Error("token required");
  return async function fetchFile(path) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${sha}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pinFile = resolve(process.argv[2] || DEFAULT_PIN);
  if (!existsSync(pinFile)) {
    console.error(`[HELD] PIN_FILE_MISSING: ${pinFile}`);
    process.exit(3);
  }
  const pin = JSON.parse(readFileSync(pinFile, "utf8"));
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("[HELD] GITHUB_TOKEN not set");
    process.exit(3);
  }
  const [owner, repo] = pin.repo.split("/");
  const fetcher = makeFetcher(token, owner, repo, pin.pinned_sha);
  const decision = await verifyAll(pin, fetcher);
  console.log(JSON.stringify(decision, null, 2));
  process.exit(decision.state === "ADMITTED" ? 0 : 1);
}
