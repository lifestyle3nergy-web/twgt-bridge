import { test } from "node:test";
import { strict as assert } from "node:assert";
import { checkApi, States } from "../lib/admission.mjs";

test("api-error: no error yields VALIDATED", () => {
  assert.equal(checkApi(null).state, States.VALIDATED);
});

test("api-error: any error forces HELD", () => {
  const err = Object.assign(new Error("boom"), { code: "API_ERROR" });
  const r = checkApi(err);
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, "API_ERROR");
  assert.equal(r.detail.code, "API_ERROR");
});

test("api-error: unknown code still forces HELD", () => {
  const r = checkApi(new Error("kaboom"));
  assert.equal(r.state, States.HELD);
  assert.equal(r.reason, "API_ERROR");
  assert.equal(r.detail.code, "UNKNOWN");
});
