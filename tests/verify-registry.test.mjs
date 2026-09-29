import { test } from "node:test";
import { strict as assert } from "node:assert";
import { sha256, verifyPinnedFile, verifyAll } from "../bin/verify-registry.mjs";

test("verify: hash of empty string is stable", () => {
  assert.equal(sha256(Buffer.from("")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("verify: matching hash yields ok", () => {
  const content = Buffer.from('{"a":1}');
  const h = sha256(content);
  const r = verifyPinnedFile(content, h);
  assert.equal(r.ok, true);
});

test("verify: mismatched hash forces HELD", () => {
  const r = verifyPinnedFile(Buffer.from('{"a":1}'), "0".repeat(64));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "HASH_MISMATCH");
});

test("verify: fetch error forces HELD", async () => {
  const pin = { pinned_sha: "deadbeef", schemas: { "schemas/registry.json": "0".repeat(64) } };
  const fetcher = async () => { throw new Error("403 Forbidden"); };
  const out = await verifyAll(pin, fetcher);
  assert.equal(out.state, "HELD");
  assert.equal(out.results[0].reason, "FETCH_ERROR");
});

test("verify: all-matching yields ADMITTED", async () => {
  const content = Buffer.from('{"ok":true}');
  const pin = { pinned_sha: "abc", schemas: { "schemas/registry.json": sha256(content) } };
  const fetcher = async () => content;
  const out = await verifyAll(pin, fetcher);
  assert.equal(out.state, "ADMITTED");
  assert.equal(out.passed, 1);
});

test("verify: one mismatch among many forces HELD", async () => {
  const good = Buffer.from('{"a":1}');
  const bad = Buffer.from('{"b":2}');
  const pin = {
    pinned_sha: "abc",
    schemas: {
      "schemas/registry.json": sha256(good),
      "schemas/v1/agent-request.json": "0".repeat(64),
    },
  };
  const fetcher = async (p) => p.endsWith("registry.json") ? good : bad;
  const out = await verifyAll(pin, fetcher);
  assert.equal(out.state, "HELD");
  assert.equal(out.failed, 1);
});

test("verify: empty schema map yields ADMITTED with zero total", async () => {
  const out = await verifyAll({ pinned_sha: "abc", schemas: {} }, async () => Buffer.from(""));
  assert.equal(out.state, "ADMITTED");
  assert.equal(out.total, 0);
});
