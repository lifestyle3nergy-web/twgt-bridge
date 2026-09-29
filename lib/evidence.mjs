import { createHash } from "node:crypto";

export const EVIDENCE_VERSION = "1.0.0";
export const FailureClass = Object.freeze({
  EXECUTION_FAILED:"execution_failed",
  COLLECTION_FAILED:"collection_failed",
  OBSERVATION_FAILED:"observation_failed",
  VALIDATION_FAILED:"validation_failed",
  INACCESSIBLE:"inaccessible",
  UNKNOWN:"unknown",
});

export function canonicalJson(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

export function digestEvidence(batch) {
  const body = JSON.stringify(batch);
  return "sha256:" + createHash("sha256").update(body,"utf8").digest("hex");
}

export function makeEvidenceManifest(batch, decision) {
  if (!batch || typeof batch !== "object" || !decision) {
    throw new Error("batch and decision are required");
  }
  return {
    evidence_version:EVIDENCE_VERSION,
    bridge_version:batch.bridge_version,
    collected_at:batch.collected_at,
    source:batch.source,
    decision:{state:decision.state,reason:decision.reason},
    payload_hash:digestEvidence(batch),
    entry_count:Array.isArray(batch.entries)?batch.entries.length:0,
  };
}

export function validateManifest(manifest, batch) {
  if (!manifest || manifest.evidence_version !== EVIDENCE_VERSION) return {state:"HELD",reason:"UNSUPPORTED_EVIDENCE_VERSION"};
  if (!batch || manifest.payload_hash !== digestEvidence(batch)) return {state:"HELD",reason:"EVIDENCE_HASH_MISMATCH"};
  if (manifest.entry_count !== (Array.isArray(batch.entries)?batch.entries.length:0)) return {state:"HELD",reason:"ENTRY_COUNT_MISMATCH"};
  return {state:"VALIDATED",reason:"EVIDENCE_MANIFEST_OK"};
}
