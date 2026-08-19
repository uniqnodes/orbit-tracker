import { parse } from "yaml";
import type { TrackingSnapshot } from "./remote";
import { developmentLogDocumentSchema, legacyCleanupDocumentSchema, plannedImprovementDocumentSchema, proposedImprovementDocumentSchema } from "./schema";

type CatalogItem = { id: string; name: string; group?: string };

export type TrackingWorkspace = {
  catalog: { services: CatalogItem[]; components: CatalogItem[]; areas: CatalogItem[] };
  relationships: {
    plannedImprovements: { id: string; title: string }[];
    developmentLogs: { id: string; title: string }[];
    proposals: { id: string; title: string }[];
    legacyCleanup: { id: string; title: string }[];
  };
};

export function buildTrackingWorkspace(snapshot: TrackingSnapshot): TrackingWorkspace {
  const planned = plannedImprovementDocumentSchema.parse(parse(snapshot.sources.plannedImprovements));
  const development = developmentLogDocumentSchema.parse(parse(snapshot.sources.developmentLog));
  const proposals = proposedImprovementDocumentSchema.parse(parse(snapshot.sources.proposedImprovements));
  const legacy = legacyCleanupDocumentSchema.parse(parse(snapshot.sources.legacyCleanup));
  return {
    catalog: { services: snapshot.manifest.services, components: snapshot.manifest.components, areas: snapshot.manifest.areas },
    relationships: {
      plannedImprovements: planned.records.map(({ id, title }) => ({ id, title })),
      developmentLogs: development.records.map(({ id, title }) => ({ id, title })),
      proposals: proposals.records.map(({ id, title }) => ({ id, title })),
      legacyCleanup: legacy.records.map(({ id, title }) => ({ id, title })),
    },
  };
}
