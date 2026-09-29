import { test } from "node:test";
import { strict as assert } from "node:assert";
import { checkStaleness, States } from "../lib/admission.mjs";

test("stale-evidence: fresh evidence yields VALIDATED", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const ev = { collected_at: "2026-01-01T11:59:00Z" };
  assert.equal(checkStaleness(now, ev, 3600).state, States.VALIDATED);
});

test("stale-evidence: old evidence forces HELD", () => {
  const now = new Date("2026-01-02T12:00:00Z");
  const ev = { collected_at: "2026-01-01T11:00:00Z" };
  const r = checkStaleness(now, ev, 3600);
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, "STALE_EVIDENCE");
});

test("stale-evidence: missing timestamp forces HELD", () => {
  assert.equal(checkStaleness(new Date(), {}, 3600).state, States.HELD);
  assert.equal(checkStaleness(new Date(), null, 3600).state, States.HELD);
});

test("stale-evidence: invalid timestamp forces HELD", () => {
  const ev = { collected_at: "not-a-date" };
  assert.equal(checkStaleness(new Date(), ev, 3600).state, States.HELD);
});
