import test from "node:test";
import assert from "node:assert/strict";
import { digestEvidence,makeEvidenceManifest,validateManifest } from "../lib/evidence.mjs";

test("evidence manifest binds exact batch",()=>{
  const batch={bridge_version:"0.1.0",collected_at:"2026-09-29T00:00:00.000Z",source:{owner:"o",repo:"r"},entries:[]};
  const decision={state:"EVIDENCE_READY",reason:"ALL_CHECKS_PASSED"};
  const manifest=makeEvidenceManifest(batch,decision);
  assert.match(manifest.payload_hash,/^sha256:[0-9a-f]{64}$/);
  assert.equal(validateManifest(manifest,batch).state,"VALIDATED");
  const tampered={...batch,entries:[{name:"tampered"}]};
  assert.equal(validateManifest(manifest,tampered).state,"HELD");
});

test("digest changes when evidence changes",()=>{
  const a={x:1}; const b={x:2};
  assert.notEqual(digestEvidence(a),digestEvidence(b));
});
