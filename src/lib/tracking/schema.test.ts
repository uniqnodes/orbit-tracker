import { describe, expect, it } from "vitest";
import { validatePlannedImprovements } from "./load-demo";
import { updatePlannedImprovementStatus } from "./planned-improvement-status";
import { upsertLegacyCleanup } from "./legacy-cleanup";
import { legacyCleanupDocumentSchema } from "./schema";
import { parse } from "yaml";
import { readFileSync } from "node:fs";
import { upsertPlannedImprovement } from "./planned-improvement-status";
import { synchronizeRelationships } from "./relationship-sync";

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

  it("does not allow a legacy record to be marked removed without removal evidence", () => {
    expect(() => upsertLegacyCleanup(`
schemaVersion: 1
recordType: legacy-cleanup
nextSequence: 2
records:
  - id: LEG-001
    title: Temporary compatibility path
    status: active
    legacyPath: adapter/compatibility.ts
    reasonRetained: A staged rollout still consumes the older contract.
    introduction: { description: Compatibility path introduced during rollout. }
    owner: { plannedImprovementIds: [], description: PI-001 owns the transition. }
    removal: { condition: Remove it when the staged rollout is complete., evidence: null }
    scope: { services: [], components: [], areas: [] }
    references: []
    removedAt: null
    relationships: { developmentLogIds: [] }
`, {
      id: "LEG-001", title: "Temporary compatibility path", status: "removed",
      legacyPath: "adapter/compatibility.ts", reasonRetained: "A staged rollout still consumes the older contract.",
      introductionDescription: "Compatibility path introduced during rollout.", removalCondition: "Remove it when the staged rollout is complete.",
      ownerDescription: "PI-001 owns the transition.", plannedImprovementIds: [],
      scope: { services: [], components: [], areas: [] }, developmentLogIds: [],
    })).toThrow("dedicated evidence workflow");
  });

  it("writes only the two relationship endpoints", () => {
    const basePath = "/Users/aa/Desktop/projects/orbit-tracking-test/docs/project-tracking";
    const sources = {
      plannedImprovements: readFileSync(`${basePath}/planned-improvements.yaml`, "utf8"),
      developmentLog: readFileSync(`${basePath}/development-log.yaml`, "utf8"),
      proposedImprovements: readFileSync(`${basePath}/proposed-improvements.yaml`, "utf8"),
      legacyCleanup: readFileSync(`${basePath}/legacy-cleanup.yaml`, "utf8"),
    };
    const content = upsertPlannedImprovement(sources.plannedImprovements, {
      title: "Relationship source preservation", status: "backlog", priority: "medium",
      categories: ["documentation"], summary: "Verify source preservation.", goal: "Change only relationship endpoints.",
      scope: { services: [], components: [], areas: [] },
      relationships: { proposalIds: ["PROP-001"], developmentLogIds: [], legacyCleanupIds: [] },
    });
    const updated = synchronizeRelationships({ sources } as never, "plannedImprovements", content);

    expect(updated.plannedImprovements).not.toBe(sources.plannedImprovements);
    expect(updated.proposedImprovements).not.toBe(sources.proposedImprovements);
    expect(updated.developmentLog).toBe(sources.developmentLog);
    expect(updated.legacyCleanup).toBe(sources.legacyCleanup);
  });
});
