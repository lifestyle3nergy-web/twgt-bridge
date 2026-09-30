// Fail-closed admission. Nothing auto-passes.
// Three admission states: COLLECTED, VALIDATED, ADMITTED.
// HELD is the explicit failure/unknown outcome and is never coerced to admission.

export const States = Object.freeze({
  COLLECTED: "COLLECTED",
  VALIDATED: "VALIDATED",
  ADMITTED: "ADMITTED",
  HELD: "HELD",
});

export const ReasonCode = Object.freeze({
  BASELINE_ABSENT: "BASELINE_ABSENT",
  BASELINE_PRESENT: "BASELINE_PRESENT",
  API_ERROR: "API_ERROR",
  NO_API_ERROR: "NO_API_ERROR",
  EVIDENCE_MISSING_VERSION: "EVIDENCE_MISSING_VERSION",
  UNSUPPORTED_SCHEMA_VERSION: "UNSUPPORTED_SCHEMA_VERSION",
  SCHEMA_VERSION_OK: "SCHEMA_VERSION_OK",
  EVIDENCE_MISSING_TIMESTAMP: "EVIDENCE_MISSING_TIMESTAMP",
  EVIDENCE_BAD_TIMESTAMP: "EVIDENCE_BAD_TIMESTAMP",
  STALE_EVIDENCE: "STALE_EVIDENCE",
  FRESH: "FRESH",
  ALL_CHECKS_PASSED: "ALL_CHECKS_PASSED",
  PIN_SCHEMA_MISSING_OR_EMPTY: "PIN_SCHEMA_MISSING_OR_EMPTY",
});

export function checkBaseline(prior) {
  if (!prior || !Array.isArray(prior.entries) || prior.entries.length === 0) {
    return { state: States.HELD, reason: ReasonCode.BASELINE_ABSENT };
  }
  return { state: States.VALIDATED, reason: ReasonCode.BASELINE_PRESENT };
}

export function checkApi(error) {
  if (!error) return { state: States.VALIDATED, reason: ReasonCode.NO_API_ERROR };
  return {
    state: States.HELD,
    reason: ReasonCode.API_ERROR,
    detail: { code: error.code || "UNKNOWN", message: String(error.message || error) },
  };
}

export function checkStaleness(now, evidence, maxAgeSeconds) {
  if (!evidence || !evidence.collected_at) {
    return { state: States.HELD, reason: ReasonCode.EVIDENCE_MISSING_TIMESTAMP };
  }
  const ageMs = now.getTime() - new Date(evidence.collected_at).getTime();
  const ageSeconds = Math.floor(ageMs / 1000);
  if (!Number.isFinite(ageSeconds)) {
    return { state: States.HELD, reason: ReasonCode.EVIDENCE_BAD_TIMESTAMP };
  }
  if (ageSeconds > maxAgeSeconds) {
    return { state: States.HELD, reason: ReasonCode.STALE_EVIDENCE, age_seconds: ageSeconds };
  }
  return { state: States.VALIDATED, reason: ReasonCode.FRESH, age_seconds: ageSeconds };
}

export function checkSchemaVersion(evidence, supportedVersions) {
  if (!evidence || !evidence.bridge_version) {
    return { state: States.HELD, reason: ReasonCode.EVIDENCE_MISSING_VERSION };
  }
  if (!supportedVersions.includes(evidence.bridge_version)) {
    return {
      state: States.HELD,
      reason: ReasonCode.UNSUPPORTED_SCHEMA_VERSION,
      detail: { found: evidence.bridge_version, supported: supportedVersions },
    };
  }
  return { state: States.VALIDATED, reason: ReasonCode.SCHEMA_VERSION_OK };
}

export function admit({ evidence, prior, apiError, now = new Date(), maxAgeSeconds = 24 * 3600, supportedVersions = ["0.1.0"] }) {
  const checks = [
    checkApi(apiError),
    checkBaseline(prior),
    checkSchemaVersion(evidence, supportedVersions),
    checkStaleness(now, evidence, maxAgeSeconds),
  ];
  const held = checks.find(c => c.state === States.HELD);
  if (held) return { state: States.HELD, checks, reason: held.reason, detail: held.detail };
  return { state: States.ADMITTED, checks, reason: ReasonCode.ALL_CHECKS_PASSED };
}
