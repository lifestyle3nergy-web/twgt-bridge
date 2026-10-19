import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SCAN_DIRS = ["lib", "bin"];

function scan(predicate) {
  const hits = [];
  for (const dir of SCAN_DIRS) {
    const full = join(ROOT, dir);
    for (const name of readdirSync(full)) {
      if (!name.endsWith(".mjs")) continue;
      const text = readFileSync(join(full, name), "utf8");
      text.split("\n").forEach((line, i) => {
        if (predicate(line)) {
          hits.push(`${dir}/${name}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
  return hits;
}

test("bridge never exposes ADMITTED as a state name", () => {
  const hits = scan((line) => line.includes("ADMITTED"));
  assert.deepEqual(
    hits,
    [],
    `Bridge must not contain the state name ADMITTED. Found:\n${hits.join("\n")}`
  );
});

test("bridge never defines admit() as an exported function", () => {
  const hits = scan((line) => /export\s+function\s+admit\s*\(/.test(line));
  assert.deepEqual(hits, [], `Forbidden admit() export found:\n${hits.join("\n")}`);
});

test("bridge never calls admit(", () => {
  const hits = scan((line) => /\badmit\s*\(/.test(line));
  assert.deepEqual(hits, [], `Forbidden admit() call found:\n${hits.join("\n")}`);
});

test("lib/admission.mjs exports evaluate and defines EVIDENCE_READY", () => {
  const src = readFileSync(join(ROOT, "lib", "admission.mjs"), "utf8");
  assert.match(src, /export\s+function\s+evaluate\s*\(/);
  assert.doesNotMatch(src, /export\s+function\s+admit\s*\(/);
  assert.match(src, /EVIDENCE_READY:\s*"EVIDENCE_READY"/);
});
