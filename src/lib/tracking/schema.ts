import { z } from "zod";

const scopeSchema = z.object({
  services: z.array(z.string()),
  components: z.array(z.string()),
  areas: z.array(z.string()),
});

const sourceSchema = z.object({
  type: z.string(),
  label: z.string().nullable().optional(),
  attributes: z.record(z.string(), z.unknown()),
});

export const plannedImprovementSchema = z.object({
  id: z.string().regex(/^PI-\d{3}$/),
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  status: z.enum(["backlog", "in_progress", "blocked", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  categories: z.array(z.string()).min(1),
  summary: z.string().min(1),
  goal: z.string().min(1),
  scope: scopeSchema,
  origin: sourceSchema,
  references: z.array(z.unknown()),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  completion: z.unknown().nullable(),
  relationships: z.object({
    proposalIds: z.array(z.string()),
    developmentLogIds: z.array(z.string()),
    legacyCleanupIds: z.array(z.string()),
  }),
});

export const plannedImprovementDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  recordType: z.literal("planned-improvement"),
  nextSequence: z.number().int().positive(),
  executionFocus: z.unknown(),
  records: z.array(plannedImprovementSchema),
});

export type PlannedImprovement = z.infer<typeof plannedImprovementSchema>;
