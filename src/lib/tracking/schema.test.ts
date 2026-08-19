import { describe, expect, it } from "vitest";
import { validatePlannedImprovements } from "./load-demo";
import { updatePlannedImprovementStatus } from "./planned-improvement-status";
import { upsertLegacyCleanup } from "./legacy-cleanup";
import { legacyCleanupDocumentSchema } from "./schema";
import { parse } from "yaml";

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

  it("creates a legacy-cleanup record with its owner and relationships", () => {
    const updated = upsertLegacyCleanup(`
schemaVersion: 1
recordType: legacy-cleanup
nextSequence: 1
records: []
`, {
      title: "Temporary compatibility path",
      status: "planned",
      legacyPath: "adapter/compatibility.ts",
      reasonRetained: "A staged rollout still consumes the older contract.",
      introductionDescription: "Compatibility path introduced during rollout.",
      removalCondition: "Remove it when the staged rollout is complete.",
      ownerDescription: "PI-001 owns the transition.",
      plannedImprovementIds: ["PI-001"],
      scope: { services: ["catalog"], components: [], areas: ["delivery"] },
      developmentLogIds: ["2026-08-19-rollout"],
    });

    const document = legacyCleanupDocumentSchema.parse(parse(updated));
    expect(document.nextSequence).toBe(2);
    expect(document.records[0]).toMatchObject({
      id: "LEG-001",
      owner: { plannedImprovementIds: ["PI-001"] },
      relationships: { developmentLogIds: ["2026-08-19-rollout"] },
    });
  });
});
