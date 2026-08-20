import { cookies } from "next/headers";
import { parse } from "yaml";
import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { loadTrackingSnapshot } from "@/lib/tracking/remote";
import { developmentLogDocumentSchema, legacyCleanupDocumentSchema, plannedImprovementDocumentSchema, proposedImprovementDocumentSchema } from "@/lib/tracking/schema";
import { buildTrackingWorkspace } from "@/lib/tracking/workspace";
import { TrackingWorkspace } from "./tracking-workspace";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ project?: string; branch?: string }> }) {
  const session = await sessionStore().get((await cookies()).get("orbit_session")?.value);
  if (!session) return <main><h1>Connection required</h1></main>;
  const query = await searchParams;
  const project = allowedProjects().find((item) => item.provider === session.account.provider && item.slug === query.project) ?? allowedProjects().find((item) => item.provider === session.account.provider);
  if (!project) return <main><h1>No allowed project</h1></main>;
  const { branches, snapshot } = await loadTrackingSnapshot({ project, accessToken: session.token.accessToken, branchName: query.branch });
  const workspace = buildTrackingWorkspace(snapshot);
  const planned = plannedImprovementDocumentSchema.parse(parse(snapshot.sources.plannedImprovements));
  const proposals = proposedImprovementDocumentSchema.parse(parse(snapshot.sources.proposedImprovements));
  const developmentLogs = developmentLogDocumentSchema.parse(parse(snapshot.sources.developmentLog));
  const legacyCleanup = legacyCleanupDocumentSchema.parse(parse(snapshot.sources.legacyCleanup));
  const canWrite = snapshot.branch.canPush !== false;
  return <TrackingWorkspace
    project={project.slug}
    projectName={snapshot.manifest.project.name}
    branch={snapshot.branch.name}
    expectedBranchCommit={snapshot.branch.commit}
    branches={branches}
    canWrite={canWrite}
    catalog={workspace.catalog}
    relationships={workspace.relationships}
    planned={planned.records}
    development={developmentLogs.records}
    proposals={proposals.records}
    legacy={legacyCleanup.records}
  />;
}
