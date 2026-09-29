import { test } from "node:test";
import { strict as assert } from "node:assert";
import { checkBaseline, States } from "../lib/admission.mjs";

test("baseline-absent: missing prior forces HELD", () => {
  assert.equal(checkBaseline(null).state, States.HELD);
  assert.equal(checkBaseline(undefined).state, States.HELD);
});

test("baseline-absent: empty entries forces HELD", () => {
  assert.equal(checkBaseline({ entries: [] }).state, States.HELD);
});

test("baseline-absent: malformed prior forces HELD", () => {
  assert.equal(checkBaseline({}).state, States.HELD);
  assert.equal(checkBaseline({ entries: "not-an-array" }).state, States.HELD);
});

test("baseline-absent: populated prior yields VALIDATED", () => {
  const r = checkBaseline({ entries: [{ name: "x" }] });
  assert.equal(r.state, States.VALIDATED);
});
