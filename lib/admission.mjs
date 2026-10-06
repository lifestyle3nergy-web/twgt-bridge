// Fail-closed admission. Nothing auto-passes.
// Three states: COLLECTED, VALIDATED, EVIDENCE_READY. Anything else is HELD.
// Every check returns HELD on failure and VALIDATED on success.

export const States = Object.freeze({
  COLLECTED: "COLLECTED",
  VALIDATED: "VALIDATED",
  EVIDENCE_READY: "EVIDENCE_READY",
  HELD: "HELD",
});

export function checkBaseline(prior) {
  if (!prior || !Array.isArray(prior.entries) || prior.entries.length === 0) {
    return { state: States.HELD, reason: "BASELINE_ABSENT" };
  }
  return { state: States.VALIDATED, reason: "BASELINE_PRESENT" };
}

export function checkApi(error) {
  if (!error) return { state: States.VALIDATED, reason: "NO_API_ERROR" };
  return {
    state: States.HELD,
    reason: "API_ERROR",
    detail: { code: error.code || "UNKNOWN", message: String(error.message || error) },
  };
}

export function checkStaleness(now, evidence, maxAgeSeconds) {
  if (!evidence || !evidence.collected_at) {
    return { state: States.HELD, reason: "EVIDENCE_MISSING_TIMESTAMP" };
  }
  const ageMs = now.getTime() - new Date(evidence.collected_at).getTime();
  const ageSeconds = Math.floor(ageMs / 1000);
  if (!Number.isFinite(ageSeconds)) {
    return { state: States.HELD, reason: "EVIDENCE_BAD_TIMESTAMP" };
  }
  if (ageSeconds > maxAgeSeconds) {
    return { state: States.HELD, reason: "STALE_EVIDENCE", age_seconds: ageSeconds };
  }
  return { state: States.VALIDATED, reason: "FRESH", age_seconds: ageSeconds };
}

export function checkSchemaVersion(evidence, supportedVersions) {
  if (!evidence || !evidence.bridge_version) {
    return { state: States.HELD, reason: "EVIDENCE_MISSING_VERSION" };
  }
  if (!supportedVersions.includes(evidence.bridge_version)) {
    return {
      state: States.HELD,
      reason: "UNSUPPORTED_SCHEMA_VERSION",
      detail: { found: evidence.bridge_version, supported: supportedVersions },
    };
  }
  return { state: States.VALIDATED, reason: "SCHEMA_VERSION_OK" };
}

export function evaluate({ evidence, prior, apiError, now = new Date(), maxAgeSeconds = 24 * 3600, supportedVersions = ["0.1.0"] }) {
  const checks = [
    checkApi(apiError),
    checkBaseline(prior),
    checkSchemaVersion(evidence, supportedVersions),
    checkStaleness(now, evidence, maxAgeSeconds),
  ];
  const held = checks.find(c => c.state === States.HELD);
  if (held) return { state: States.HELD, checks, reason: held.reason, detail: held.detail };
  return { state: States.EVIDENCE_READY, checks, reason: "ALL_CHECKS_PASSED" };
}
