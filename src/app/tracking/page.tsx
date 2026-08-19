import { cookies } from "next/headers";
import { parse } from "yaml";
import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { loadTrackingSnapshot } from "@/lib/tracking/remote";
import { developmentLogDocumentSchema, legacyCleanupDocumentSchema, plannedImprovementDocumentSchema, proposedImprovementDocumentSchema } from "@/lib/tracking/schema";
import { buildTrackingWorkspace } from "@/lib/tracking/workspace";
import { EditPlannedImprovementForm } from "./edit-planned-improvement-form";
import { NewDevelopmentLogForm } from "./new-development-log-form";
import { NewPlannedImprovementForm } from "./new-planned-improvement-form";
import { NewProposalForm } from "./new-proposal-form";
import { EditProposalForm } from "./edit-proposal-form";
import { EditLegacyCleanupForm } from "./edit-legacy-cleanup-form";
import { NewLegacyCleanupForm } from "./new-legacy-cleanup-form";
import { EditDevelopmentLogForm } from "./edit-development-log-form";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ project?: string; branch?: string }> }) {
  const session = await sessionStore().get((await cookies()).get("orbit_session")?.value);
  if (!session) return <main><h1>Connection required</h1></main>;
  const query = await searchParams;
  const project = allowedProjects().find((item) => item.provider === session.account.provider && item.slug === query.project) ?? allowedProjects().find((item) => item.provider === session.account.provider);
  if (!project) return <main><h1>No allowed project</h1></main>;
  const { snapshot } = await loadTrackingSnapshot({ project, accessToken: session.token.accessToken, branchName: query.branch });
  const workspace = buildTrackingWorkspace(snapshot);
  const planned = plannedImprovementDocumentSchema.parse(parse(snapshot.sources.plannedImprovements));
  const proposals = proposedImprovementDocumentSchema.parse(parse(snapshot.sources.proposedImprovements));
  const developmentLogs = developmentLogDocumentSchema.parse(parse(snapshot.sources.developmentLog));
  const legacyCleanup = legacyCleanupDocumentSchema.parse(parse(snapshot.sources.legacyCleanup));
  const context = { project: project.slug, branch: snapshot.branch.name, expectedBranchCommit: snapshot.branch.commit };
  return <main>
    <h1>{snapshot.manifest.project.name}</h1>
    <section><h2>New planned improvement</h2><NewPlannedImprovementForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></section>
    <section><h2>New development log</h2><NewDevelopmentLogForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></section>
    <section><h2>New proposal</h2><NewProposalForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></section>
    <section><h2>New legacy cleanup</h2><NewLegacyCleanupForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></section>
    <section><h2>Development log</h2><ul>{developmentLogs.records.map((record) => <li key={record.id}><EditDevelopmentLogForm {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} /></li>)}</ul></section>
    <section><h2>Proposals</h2><ul>{proposals.records.map((record) => <li key={record.id}><EditProposalForm {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} /></li>)}</ul></section>
    <section><h2>Legacy cleanup</h2><ul>{legacyCleanup.records.map((record) => <li key={record.id}><EditLegacyCleanupForm {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} /></li>)}</ul></section>
    <section><h2>Planned improvements</h2>{planned.records.map((record) => <EditPlannedImprovementForm key={record.id} {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} />)}</section>
  </main>;
}
