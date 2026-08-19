import { z } from "zod";

const identifier = z.string().min(1);
const timestamp = z.string().min(1);
const scopeSchema = z.object({ services: z.array(identifier), components: z.array(identifier), areas: z.array(identifier) });
const referencesSchema = z.array(z.unknown());
const gitCommitSchema = z.object({ sha: identifier, committedAt: timestamp });
const gitSchema = z.object({ branch: identifier, commits: z.array(gitCommitSchema) });

export const plannedImprovementStatuses = ["backlog", "in_progress", "blocked", "completed"] as const;
const plannedImprovementCategory = z.enum(["architecture", "data_integrity", "database_safety", "developer_experience", "documentation", "operational", "reliability", "security", "testing"]);

export const plannedImprovementSchema = z.object({
  id: z.string().regex(/^PI-\d{3}$/), sequence: z.number().int().positive(), title: identifier,
  status: z.enum(plannedImprovementStatuses), priority: z.enum(["low", "medium", "high"]), categories: z.array(plannedImprovementCategory).min(1), summary: identifier, goal: identifier, scope: scopeSchema,
  origin: z.object({ type: identifier, label: z.string().nullable().optional(), attributes: z.record(z.string(), z.unknown()) }), references: referencesSchema, createdAt: timestamp, completedAt: timestamp.nullish(),
  completion: z.object({ developmentLogIds: z.array(identifier), git: gitSchema }).nullish(), relationships: z.object({ proposalIds: z.array(identifier), developmentLogIds: z.array(identifier), legacyCleanupIds: z.array(identifier) }),
});
export const plannedImprovementDocumentSchema = z.object({ schemaVersion: z.literal(1), recordType: z.literal("planned-improvement"), nextSequence: z.number().int().positive(), executionFocus: z.unknown().optional(), records: z.array(plannedImprovementSchema) });

const developmentLogCategory = z.enum(["architecture", "bug_fix", "database_safety", "developer_experience", "documentation", "operational", "reliability", "security", "system_improvement"]);
export const developmentLogDocumentSchema = z.object({ schemaVersion: z.literal(1), recordType: z.literal("development-log"), records: z.array(z.object({ id: identifier, title: identifier, categories: z.array(developmentLogCategory).min(1), reason: z.object({ type: identifier, summary: identifier }), details: identifier, systemImpact: z.array(identifier), scope: scopeSchema, references: referencesSchema, createdAt: timestamp, completedAt: timestamp.optional(), git: gitSchema, relationships: z.object({ plannedImprovementIds: z.array(identifier), proposalIds: z.array(identifier), legacyCleanupIds: z.array(identifier) }) })) });

export const proposedImprovementDocumentSchema = z.object({ schemaVersion: z.literal(1), recordType: z.literal("proposed-improvement"), nextSequence: z.number().int().positive(), records: z.array(z.object({ id: z.string().regex(/^PROP-\d{3}$/), title: identifier, status: z.enum(["under_review", "accepted", "rejected", "deferred"]), summary: identifier, rationale: identifier, content: identifier, decisionQuestions: z.array(identifier), scope: scopeSchema, references: referencesSchema, relationships: z.object({ plannedImprovementIds: z.array(identifier), developmentLogIds: z.array(identifier) }) })) });

export const legacyCleanupDocumentSchema = z.object({ schemaVersion: z.literal(1), recordType: z.literal("legacy-cleanup"), nextSequence: z.number().int().positive(), records: z.array(z.object({ id: z.string().regex(/^LEG-\d{3}$/), title: identifier, status: z.enum(["planned", "active", "removed"]), legacyPath: identifier, reasonRetained: identifier, introduction: z.object({ description: identifier, occurredAt: timestamp.optional() }), owner: z.object({ plannedImprovementIds: z.array(identifier), description: identifier }), removal: z.object({ condition: identifier, evidence: z.string().nullable() }), scope: scopeSchema, references: referencesSchema, removedAt: timestamp.nullable(), relationships: z.object({ developmentLogIds: z.array(identifier) }) })) });

export type PlannedImprovement = z.infer<typeof plannedImprovementSchema>;
