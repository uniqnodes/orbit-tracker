import { parse, stringify } from "yaml";
import { developmentLogDocumentSchema } from "./schema";

export function upsertDevelopmentLog(source: string, input: { id?: string; branch: string; title: string; categories: string[]; reasonType: string; reasonSummary: string; details: string; systemImpact: string[]; scope: { services: string[]; components: string[]; areas: string[] }; relationships: { plannedImprovementIds: string[]; proposalIds: string[]; legacyCleanupIds: string[] } }) {
  const document = developmentLogDocumentSchema.parse(parse(source));
  const existing = input.id ? document.records.find((record) => record.id === input.id) : undefined;
  if (input.id && !existing) throw new Error("The development-log record no longer exists. Reload before saving.");
  const record = {
    ...(existing ?? { id: `${new Date().toISOString().slice(0, 10)}-manual-${slug(input.title)}`, createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), git: { branch: input.branch, commits: [] }, references: [] }),
    title: input.title, categories: input.categories, reason: { type: input.reasonType, summary: input.reasonSummary }, details: input.details, systemImpact: input.systemImpact, scope: input.scope, relationships: input.relationships,
  };
  if (!existing && document.records.some((candidate) => candidate.id === record.id)) throw new Error("A development-log record with this generated ID already exists. Change the title before saving.");
  const parsed = developmentLogDocumentSchema.shape.records.element.parse(record);
  if (existing) Object.assign(existing, parsed); else document.records.push(parsed);
  return stringify(document);
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "development-log"; }
