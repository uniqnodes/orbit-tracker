import { describe, expect, it } from "vitest";
import { validatePlannedImprovements } from "./load-demo";
import { updatePlannedImprovementStatus } from "./planned-improvement-status";

describe("planned-improvement contract", () => {
  it("accepts a minimal version-one document", () => {
    const document = validatePlannedImprovements(`
schemaVersion: 1
recordType: planned-improvement
nextSequence: 2
executionFocus: []
records:
  - id: PI-001
    sequence: 1
    title: Example
    status: backlog
    priority: medium
    categories: [reliability]
    summary: Example summary
    goal: Example goal
    scope: { services: [], components: [], areas: [] }
    origin: { type: discovery, attributes: {} }
    references: []
    createdAt: "2026-08-18T00:00:00+03:00"
    completedAt: null
    completion: null
    relationships: { proposalIds: [], developmentLogIds: [], legacyCleanupIds: [] }
`);

    expect(document.records).toHaveLength(1);
  });

  it("updates only the requested planned-improvement status", () => {
    const source = `
schemaVersion: 1
recordType: planned-improvement
nextSequence: 2
executionFocus: []
records:
  - id: PI-001
    sequence: 1
    title: Example
    status: backlog
    priority: medium
    categories: [reliability]
    summary: Example summary
    goal: Example goal
    scope: { services: [], components: [], areas: [] }
    origin: { type: discovery, attributes: {} }
    references: []
    createdAt: "2026-08-18T00:00:00+03:00"
    completedAt: null
    completion: null
    relationships: { proposalIds: [], developmentLogIds: [], legacyCleanupIds: [] }
`;

    const updated = updatePlannedImprovementStatus(source, { recordId: "PI-001", status: "in_progress" });

    expect(validatePlannedImprovements(updated).records[0].status).toBe("in_progress");
  });
});
