import { parse, stringify } from "yaml";
import { plannedImprovementDocumentSchema, plannedImprovementSchema, plannedImprovementStatuses } from "./schema";

export function updatePlannedImprovementStatus(source: string, input: { recordId: string; status: (typeof plannedImprovementStatuses)[number] }) {
  const document = plannedImprovementDocumentSchema.parse(parse(source));
  const record = document.records.find((candidate) => candidate.id === input.recordId);
  if (!record) throw new Error("The planned-improvement record no longer exists. Reload before saving.");
  record.status = input.status;
  return stringify(document);
}

export function upsertPlannedImprovement(source: string, input: { id?: string; title: string; status: (typeof plannedImprovementStatuses)[number]; priority: "low" | "medium" | "high"; categories: string[]; summary: string; goal: string; scope: { services: string[]; components: string[]; areas: string[] }; relationships: { proposalIds: string[]; developmentLogIds: string[]; legacyCleanupIds: string[] } }) {
  const document = plannedImprovementDocumentSchema.parse(parse(source));
  const existing = input.id ? document.records.find((record) => record.id === input.id) : undefined;
  if (input.id && !existing) throw new Error("The planned-improvement record no longer exists. Reload before saving.");
  const record = plannedImprovementSchema.parse({
    ...(existing ?? { id: `PI-${String(document.nextSequence).padStart(3, "0")}`, sequence: document.nextSequence, origin: { type: "manual_entry", attributes: {} }, references: [], createdAt: new Date().toISOString(), completedAt: null, completion: null }),
    ...input,
  });
  if (existing) Object.assign(existing, record);
  else { document.records.push(record); document.nextSequence += 1; }
  return stringify(document);
}
