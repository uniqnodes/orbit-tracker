import Link from "next/link";
import { cookies } from "next/headers";
import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { loadTrackingSnapshot } from "@/lib/tracking/remote";
import { plannedImprovementDocumentSchema } from "@/lib/tracking/schema";
import { parse } from "yaml";
import { PlannedStatusForm } from "./planned-status-form";
import { buildTrackingWorkspace } from "@/lib/tracking/workspace";
import { NewPlannedImprovementForm } from "./new-planned-improvement-form";

type Props = { searchParams: Promise<{ project?: string; branch?: string }> };

export default async function TrackingPage({ searchParams }: Props) {
  const sessionId = (await cookies()).get("orbit_session")?.value;
  const session = sessionId ? await sessionStore().get(sessionId) : null;
  if (!session) return <main><h1>Connection required</h1><p>Connect a provider before loading tracking sources.</p><Link href="/">Return to ORBIT</Link></main>;
  const { project: requestedProject, branch } = await searchParams;
  const project = allowedProjects().find((candidate) => candidate.provider === session.account.provider && candidate.slug === requestedProject) ?? allowedProjects().find((candidate) => candidate.provider === session.account.provider);
  if (!project) return <main><h1>No allowed project</h1><p>This provider has no project in the deployment allowlist.</p><Link href="/">Return to ORBIT</Link></main>;
  const { branches, snapshot } = await loadTrackingSnapshot({ project, accessToken: session.token.accessToken, branchName: branch });
  const planned = plannedImprovementDocumentSchema.parse(parse(snapshot.sources.plannedImprovements));
  const workspace = buildTrackingWorkspace(snapshot);
  return <main><p className="eyebrow">{snapshot.project.provider} · {snapshot.project.slug}</p><h1>{snapshot.manifest.project.name}</h1><p className="lede">Branch <strong>{snapshot.branch.name}</strong> at commit <code>{snapshot.branch.commit.slice(0, 12)}</code>.</p><nav className="actions">{branches.map((item) => <Link key={item.name} className={item.name === snapshot.branch.name ? "button" : "button secondary"} href={`/tracking?project=${encodeURIComponent(project.slug)}&branch=${encodeURIComponent(item.name)}`}>{item.name}</Link>)}</nav><section><h2>Tracking sources</h2><ul>{Object.entries(snapshot.sources).map(([name, source]) => <li key={name}><strong>{name}</strong>: {((parseRecordCount(source)))} records</li>)}</ul></section><section><h2>Project catalog</h2><p>{workspace.catalog.services.length} services · {workspace.catalog.components.length} components · {workspace.catalog.areas.length} areas</p></section><section><h2>New planned improvement</h2><NewPlannedImprovementForm project={project.slug} branch={snapshot.branch.name} expectedBranchCommit={snapshot.branch.commit} catalog={workspace.catalog} relationships={workspace.relationships} /></section><section><h2>Planned improvements</h2><p>Changing a status writes only the declared planned-improvements source to this branch.</p><ul>{planned.records.map((record) => <PlannedStatusForm key={record.id} project={project.slug} branch={snapshot.branch.name} expectedBranchCommit={snapshot.branch.commit} record={{ id: record.id, title: record.title, status: record.status }} />)}</ul></section><Link href="/">Return to ORBIT</Link></main>;
}

function parseRecordCount(source: string) {
  const records = source.match(/^records:\s*$/m) ? (source.match(/^\s+- id:/gm)?.length ?? 0) : 0;
  return records;
}
