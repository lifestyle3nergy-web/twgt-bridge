// Fail-closed structural guard for the published evidence-batch contract.
// The exact schema is pinned in pins/twgt-schema-gate.json.

export function validateEvidenceBatch(document) {
  const errors = [];
  if (!document || typeof document !== "object" || Array.isArray(document)) errors.push("root must be an object");
  if (!document?.decision || typeof document.decision !== "object" || Array.isArray(document.decision)) errors.push("decision must be an object");
  if (!document?.batch || typeof document.batch !== "object" || Array.isArray(document.batch)) errors.push("batch must be an object");

  const d = document?.decision;
  if (d) {
    if (!["COLLECTED", "VALIDATED", "ADMITTED", "HELD"].includes(d.state)) errors.push("decision.state invalid");
    if (typeof d.reason !== "string" || d.reason.length === 0) errors.push("decision.reason missing");
    if (!Array.isArray(d.checks) || d.checks.length === 0) errors.push("decision.checks must be non-empty");
    for (const [i, c] of (d.checks || []).entries()) {
      if (!c || typeof c !== "object") errors.push(`decision.checks[${i}] invalid`);
      else {
        if (!["VALIDATED", "HELD", "COLLECTED", "ADMITTED"].includes(c.state)) errors.push(`decision.checks[${i}].state invalid`);
        if (typeof c.reason !== "string" || c.reason.length === 0) errors.push(`decision.checks[${i}].reason missing`);
      }
    }
  }

  const b = document?.batch;
  if (b) {
    if (typeof b.bridge_version !== "string" || !/^\d+\.\d+\.\d+$/.test(b.bridge_version)) errors.push("batch.bridge_version invalid");
    if (typeof b.collected_at !== "string" || Number.isNaN(Date.parse(b.collected_at))) errors.push("batch.collected_at invalid");
    if (!b.source || typeof b.source !== "object" || Array.isArray(b.source)) errors.push("batch.source invalid");
    else {
      if (typeof b.source.owner !== "string" || b.source.owner.length === 0) errors.push("batch.source.owner missing");
      if (typeof b.source.repo !== "string" || b.source.repo.length === 0) errors.push("batch.source.repo missing");
    }
    if (!Array.isArray(b.entries) || b.entries.length === 0) errors.push("batch.entries must be non-empty");
    for (const [i, e] of (b.entries || []).entries()) {
      if (!e || typeof e !== "object") errors.push(`batch.entries[${i}] invalid`);
      else {
        if (typeof e.name !== "string" || e.name.length === 0) errors.push(`batch.entries[${i}].name missing`);
        if (typeof e.ok !== "boolean") errors.push(`batch.entries[${i}].ok missing`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
