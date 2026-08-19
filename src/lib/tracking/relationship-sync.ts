import { parse, stringify } from "yaml";
import { developmentLogDocumentSchema, legacyCleanupDocumentSchema, plannedImprovementDocumentSchema, proposedImprovementDocumentSchema } from "./schema";
import type { TrackingSnapshot } from "./remote";

type RecordType = "plannedImprovements" | "developmentLog" | "proposedImprovements" | "legacyCleanup";

export function synchronizeRelationships(snapshot: TrackingSnapshot, changed: RecordType, content: string, changedRecordId?: string) {
  const sources = { ...snapshot.sources, [changed]: content };
  const planned = plannedImprovementDocumentSchema.parse(parse(sources.plannedImprovements));
  const development = developmentLogDocumentSchema.parse(parse(sources.developmentLog));
  const proposals = proposedImprovementDocumentSchema.parse(parse(sources.proposedImprovements));
  const legacy = legacyCleanupDocumentSchema.parse(parse(sources.legacyCleanup));
  const current = changed === "plannedImprovements" ? (changedRecordId ? planned.records.find((record) => record.id === changedRecordId) : planned.records.at(-1)) : changed === "developmentLog" ? (changedRecordId ? development.records.find((record) => record.id === changedRecordId) : development.records.at(-1)) : changed === "proposedImprovements" ? (changedRecordId ? proposals.records.find((record) => record.id === changedRecordId) : proposals.records.at(-1)) : (changedRecordId ? legacy.records.find((record) => record.id === changedRecordId) : legacy.records.at(-1));
  if (!current) throw new Error("The saved tracking record could not be loaded.");

  if (changed === "plannedImprovements") {
    const record = current as typeof planned.records[number];
    synchronize(proposals.records, record.id, record.relationships.proposalIds, (item) => item.relationships.plannedImprovementIds);
    synchronize(development.records, record.id, record.relationships.developmentLogIds, (item) => item.relationships.plannedImprovementIds);
    synchronize(legacy.records, record.id, record.relationships.legacyCleanupIds, (item) => item.owner.plannedImprovementIds);
  } else if (changed === "developmentLog") {
    const record = current as typeof development.records[number];
    synchronize(planned.records, record.id, record.relationships.plannedImprovementIds, (item) => item.relationships.developmentLogIds);
    synchronize(proposals.records, record.id, record.relationships.proposalIds, (item) => item.relationships.developmentLogIds);
    synchronize(legacy.records, record.id, record.relationships.legacyCleanupIds, (item) => item.relationships.developmentLogIds);
  } else if (changed === "proposedImprovements") {
    const record = current as typeof proposals.records[number];
    synchronize(planned.records, record.id, record.relationships.plannedImprovementIds, (item) => item.relationships.proposalIds);
    synchronize(development.records, record.id, record.relationships.developmentLogIds, (item) => item.relationships.proposalIds);
  } else {
    const record = current as typeof legacy.records[number];
    synchronize(planned.records, record.id, record.owner.plannedImprovementIds, (item) => item.relationships.legacyCleanupIds);
    synchronize(development.records, record.id, record.relationships.developmentLogIds, (item) => item.relationships.legacyCleanupIds);
  }

  return {
    plannedImprovements: stringify(planned), developmentLog: stringify(development),
    proposedImprovements: stringify(proposals), legacyCleanup: stringify(legacy),
  };
}

function synchronize<T extends { id: string }>(records: T[], sourceId: string, selectedIds: string[], target: (record: T) => string[]) {
  for (const record of records) {
    const values = target(record);
    const includes = selectedIds.includes(record.id);
    const index = values.indexOf(sourceId);
    if (includes && index < 0) values.push(sourceId);
    if (!includes && index >= 0) values.splice(index, 1);
  }
}
