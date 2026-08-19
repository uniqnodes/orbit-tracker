import { parse } from "yaml";
import { trackingPath, type AllowedProject } from "@/adapters/config/provider-config";
import { providerFor } from "@/adapters/scm/provider-registry";
import type { BranchReference } from "@/core/ports/scm-provider";

type ProjectManifest = { project: { name: string; shortName: string }; tracking: { sources: Record<string, string> } };

export type TrackingSnapshot = { project: AllowedProject; branch: BranchReference; manifest: ProjectManifest; sources: Record<string, string> };

export async function loadTrackingSnapshot(input: { project: AllowedProject; accessToken: string; branchName?: string }) : Promise<{ branches: BranchReference[]; snapshot: TrackingSnapshot }> {
  const provider = providerFor(input.project.provider);
  const branches = await provider.listBranches(input.accessToken, input.project.slug);
  const branch = branches.find((candidate) => candidate.name === input.branchName) ?? branches.find((candidate) => candidate.name === "main") ?? branches[0];
  if (!branch) throw new Error("The allowed project has no readable branches.");
  const basePath = trackingPath();
  const projectSource = await provider.readFile(input.accessToken, input.project.slug, branch.name, `${basePath}/project.yaml`);
  const manifest = parse(projectSource) as ProjectManifest;
  if (!manifest?.project?.name || !manifest?.tracking?.sources) throw new Error("project.yaml does not satisfy the ORBIT project contract.");
  const sourceEntries = Object.entries(manifest.tracking.sources);
  const loaded = await Promise.all(sourceEntries.map(async ([name, file]) => [name, await provider.readFile(input.accessToken, input.project.slug, branch.name, `${basePath}/${file}`)] as const));
  return { branches, snapshot: { project: input.project, branch, manifest, sources: Object.fromEntries(loaded) } };
}
