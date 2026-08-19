import { describe, expect, it } from "vitest";
import { validatePlannedImprovements } from "./load-demo";

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
});
