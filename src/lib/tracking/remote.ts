import { parse } from "yaml";
import { trackingPath, type AllowedProject } from "@/adapters/config/provider-config";
import { providerFor } from "@/adapters/scm/provider-registry";
import type { BranchReference } from "@/core/ports/scm-provider";
import { updatePlannedImprovementStatus, upsertPlannedImprovement } from "./planned-improvement-status";
import { upsertDevelopmentLog } from "./development-log";
import { upsertProposal } from "./proposal";
import { developmentLogDocumentSchema, legacyCleanupDocumentSchema, plannedImprovementDocumentSchema, proposedImprovementDocumentSchema } from "./schema";

const requiredSources = ["plannedImprovements", "developmentLog", "proposedImprovements", "legacyCleanup"] as const;

type CatalogItem = { id: string; name: string; group?: string };
export type ProjectManifest = { project: { name: string; shortName: string }; tracking: { sources: Record<(typeof requiredSources)[number], string> }; services: CatalogItem[]; components: CatalogItem[]; areas: CatalogItem[] };

export type TrackingSnapshot = { project: AllowedProject; branch: BranchReference; manifest: ProjectManifest; sources: Record<string, string> };

export async function loadTrackingSnapshot(input: { project: AllowedProject; accessToken: string; branchName?: string }) : Promise<{ branches: BranchReference[]; snapshot: TrackingSnapshot }> {
  const provider = providerFor(input.project.provider);
  const branches = await provider.listBranches(input.accessToken, input.project.slug);
  const branch = input.branchName ? branches.find((candidate) => candidate.name === input.branchName) : branches.find((candidate) => candidate.name === "main") ?? branches[0];
  if (!branch) throw new Error("The allowed project has no readable branches.");
  const basePath = trackingPath();
  const projectSource = await provider.readFile(input.accessToken, input.project.slug, branch.name, `${basePath}/project.yaml`);
  const manifest = parse(projectSource) as ProjectManifest;
  if (!isProjectManifest(manifest)) throw new Error("project.yaml does not satisfy the ORBIT project contract.");
  const sourceEntries = Object.entries(manifest.tracking.sources);
  const loaded = await Promise.all(sourceEntries.map(async ([name, file]) => [name, await provider.readFile(input.accessToken, input.project.slug, branch.name, `${basePath}/${file}`)] as const));
  const sources = Object.fromEntries(loaded) as Record<(typeof requiredSources)[number], string>;
  validateTrackingSources(sources);
  return { branches, snapshot: { project: input.project, branch, manifest, sources } };
}

export function validateTrackingSources(sources: Record<(typeof requiredSources)[number], string>) {
  plannedImprovementDocumentSchema.parse(parse(sources.plannedImprovements));
  developmentLogDocumentSchema.parse(parse(sources.developmentLog));
  proposedImprovementDocumentSchema.parse(parse(sources.proposedImprovements));
  legacyCleanupDocumentSchema.parse(parse(sources.legacyCleanup));
}

export async function savePlannedImprovementStatus(input: {
  project: AllowedProject;
  accessToken: string;
  branch: string;
  expectedBranchCommit: string;
  recordId: string;
  status: "backlog" | "in_progress" | "blocked" | "completed";
}) {
  const { snapshot } = await loadTrackingSnapshot({ project: input.project, accessToken: input.accessToken, branchName: input.branch });
  if (snapshot.branch.commit !== input.expectedBranchCommit) throw new Error("The selected branch changed after it was loaded. Reload before saving.");
  const source = snapshot.sources.plannedImprovements;
  if (!source) throw new Error("project.yaml does not declare the planned-improvements source.");
  const content = updatePlannedImprovementStatus(source, { recordId: input.recordId, status: input.status });
  return providerFor(input.project.provider).writeFile(input.accessToken, {
    project: input.project.slug,
    branch: input.branch,
    path: `${trackingPath()}/${snapshot.manifest.tracking.sources.plannedImprovements}`,
    content,
    expectedBranchCommit: input.expectedBranchCommit,
    message: `docs(tracking): update ${input.recordId} status`,
  });
}

export async function savePlannedImprovement(input: {
  project: AllowedProject; accessToken: string; branch: string; expectedBranchCommit: string;
  record: Parameters<typeof upsertPlannedImprovement>[1];
}) {
  const { snapshot } = await loadTrackingSnapshot({ project: input.project, accessToken: input.accessToken, branchName: input.branch });
  if (snapshot.branch.commit !== input.expectedBranchCommit) throw new Error("The selected branch changed after it was loaded. Reload before saving.");
  const content = upsertPlannedImprovement(snapshot.sources.plannedImprovements, input.record);
  return providerFor(input.project.provider).writeFile(input.accessToken, {
    project: input.project.slug, branch: input.branch, path: `${trackingPath()}/${snapshot.manifest.tracking.sources.plannedImprovements}`,
    content, expectedBranchCommit: input.expectedBranchCommit, message: `docs(tracking): ${input.record.id ? `update ${input.record.id}` : "add planned improvement"}`,
  });
}

export async function saveDevelopmentLog(input: { project: AllowedProject; accessToken: string; branch: string; expectedBranchCommit: string; record: Omit<Parameters<typeof upsertDevelopmentLog>[1], "branch"> }) {
  const { snapshot } = await loadTrackingSnapshot({ project: input.project, accessToken: input.accessToken, branchName: input.branch });
  if (snapshot.branch.commit !== input.expectedBranchCommit) throw new Error("The selected branch changed after it was loaded. Reload before saving.");
  const content = upsertDevelopmentLog(snapshot.sources.developmentLog, { ...input.record, branch: input.branch });
  return providerFor(input.project.provider).writeFile(input.accessToken, { project: input.project.slug, branch: input.branch, path: `${trackingPath()}/${snapshot.manifest.tracking.sources.developmentLog}`, content, expectedBranchCommit: input.expectedBranchCommit, message: `docs(tracking): ${input.record.id ? `update ${input.record.id}` : "add development log"}` });
}
export async function saveProposal(input:{project:AllowedProject;accessToken:string;branch:string;expectedBranchCommit:string;record:Parameters<typeof upsertProposal>[1]}){const {snapshot}=await loadTrackingSnapshot({project:input.project,accessToken:input.accessToken,branchName:input.branch});if(snapshot.branch.commit!==input.expectedBranchCommit)throw new Error("The selected branch changed after it was loaded. Reload before saving.");return providerFor(input.project.provider).writeFile(input.accessToken,{project:input.project.slug,branch:input.branch,path:`${trackingPath()}/${snapshot.manifest.tracking.sources.proposedImprovements}`,content:upsertProposal(snapshot.sources.proposedImprovements,input.record),expectedBranchCommit:input.expectedBranchCommit,message:`docs(tracking): ${input.record.id?`update ${input.record.id}`:"add proposal"}`})}

function isProjectManifest(value: unknown): value is ProjectManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as { project?: { name?: unknown; shortName?: unknown }; tracking?: { sources?: Record<string, unknown> }; services?: unknown; components?: unknown; areas?: unknown };
  if (typeof manifest.project?.name !== "string" || typeof manifest.project.shortName !== "string" || !manifest.tracking?.sources) return false;
  return requiredSources.every((name) => isSafeSourceFile(manifest.tracking?.sources?.[name])) && [manifest.services, manifest.components, manifest.areas].every(isCatalog);
}

function isSafeSourceFile(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.includes("/") && !value.includes("\\") && value !== "." && value !== "..";
}

function isCatalog(value: unknown): value is CatalogItem[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && typeof (item as CatalogItem).id === "string" && typeof (item as CatalogItem).name === "string");
}
