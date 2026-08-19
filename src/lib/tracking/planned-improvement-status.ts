import { parse, stringify } from "yaml";
import { plannedImprovementDocumentSchema, plannedImprovementStatuses } from "./schema";

export function updatePlannedImprovementStatus(source: string, input: { recordId: string; status: (typeof plannedImprovementStatuses)[number] }) {
  const document = plannedImprovementDocumentSchema.parse(parse(source));
  const record = document.records.find((candidate) => candidate.id === input.recordId);
  if (!record) throw new Error("The planned-improvement record no longer exists. Reload before saving.");
  record.status = input.status;
  return stringify(document);
}
