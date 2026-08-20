import { parse, stringify } from "yaml";
import { legacyCleanupDocumentSchema } from "./schema";
export function upsertLegacyCleanup(source:string,input:{id?:string;title:string;status:"planned"|"active"|"removed";legacyPath:string;reasonRetained:string;introductionDescription:string;removalCondition:string;ownerDescription:string;plannedImprovementIds:string[];scope:{services:string[];components:string[];areas:string[]};developmentLogIds:string[]}){const doc=legacyCleanupDocumentSchema.parse(parse(source)),old=input.id?doc.records.find(x=>x.id===input.id):undefined;if(input.id&&!old)throw new Error("The legacy-cleanup record no longer exists. Reload before saving.");if(old?.status==="removed"&&input.status!=="removed")throw new Error("A closed legacy-cleanup record cannot be reopened.");if((!old||old.status!=="removed")&&input.status==="removed")throw new Error("Legacy removal requires the dedicated evidence workflow, which is not available yet.");const record={...(old??{id:`LEG-${String(doc.nextSequence).padStart(3,"0")}`,introduction:{occurredAt:new Date().toISOString()},removal:{evidence:null},references:[],removedAt:null}),title:input.title,status:input.status,legacyPath:input.legacyPath,reasonRetained:input.reasonRetained,introduction:{...(old?.introduction??{}),description:input.introductionDescription},owner:{plannedImprovementIds:input.plannedImprovementIds,description:input.ownerDescription},removal:{...(old?.removal??{}),condition:input.removalCondition,evidence:old?.removal.evidence??null},scope:input.scope,relationships:{developmentLogIds:input.developmentLogIds}};const parsed=legacyCleanupDocumentSchema.shape.records.element.parse(record);if(old)Object.assign(old,parsed);else{doc.records.push(parsed);doc.nextSequence+=1}return stringify(doc)}

export function closeLegacyCleanup(source: string, input: { id: string; evidence: string; developmentLogIds: string[]; removedAt: string }) {
  const document = legacyCleanupDocumentSchema.parse(parse(source));
  const record = document.records.find((candidate) => candidate.id === input.id);
  if (!record) throw new Error("The legacy-cleanup record no longer exists. Reload before closing.");
  if (record.status === "removed") throw new Error("This legacy-cleanup record is already closed and cannot be reopened.");
  if (!input.evidence.trim()) throw new Error("Removal evidence is required to close legacy cleanup.");
  if (input.developmentLogIds.length === 0) throw new Error("At least one development-log record is required to close legacy cleanup.");
  record.status = "removed";
  record.removedAt = input.removedAt;
  record.removal.evidence = input.evidence.trim();
  record.relationships.developmentLogIds = [...new Set(input.developmentLogIds)];
  return stringify(legacyCleanupDocumentSchema.parse(document));
}
