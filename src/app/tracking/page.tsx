import Link from "next/link";
import { cookies } from "next/headers";
import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { loadTrackingSnapshot } from "@/lib/tracking/remote";

type Props = { searchParams: Promise<{ project?: string; branch?: string }> };

export default async function TrackingPage({ searchParams }: Props) {
  const sessionId = (await cookies()).get("orbit_session")?.value;
  const session = sessionId ? await sessionStore().get(sessionId) : null;
  if (!session) return <main><h1>Connection required</h1><p>Connect a provider before loading tracking sources.</p><Link href="/">Return to ORBIT</Link></main>;
  const { project: requestedProject, branch } = await searchParams;
  const project = allowedProjects().find((candidate) => candidate.provider === session.account.provider && candidate.slug === requestedProject) ?? allowedProjects().find((candidate) => candidate.provider === session.account.provider);
  if (!project) return <main><h1>No allowed project</h1><p>This provider has no project in the deployment allowlist.</p><Link href="/">Return to ORBIT</Link></main>;
  const { branches, snapshot } = await loadTrackingSnapshot({ project, accessToken: session.token.accessToken, branchName: branch });
  return <main><p className="eyebrow">{snapshot.project.provider} · {snapshot.project.slug}</p><h1>{snapshot.manifest.project.name}</h1><p className="lede">Branch <strong>{snapshot.branch.name}</strong> at commit <code>{snapshot.branch.commit.slice(0, 12)}</code>.</p><nav className="actions">{branches.map((item) => <Link key={item.name} className={item.name === snapshot.branch.name ? "button" : "button secondary"} href={`/tracking?project=${encodeURIComponent(project.slug)}&branch=${encodeURIComponent(item.name)}`}>{item.name}</Link>)}</nav><section><h2>Tracking sources</h2><ul>{Object.entries(snapshot.sources).map(([name, source]) => <li key={name}><strong>{name}</strong>: {((parseRecordCount(source)))} records</li>)}</ul></section><Link href="/">Return to ORBIT</Link></main>;
}

function parseRecordCount(source: string) {
  const records = source.match(/^records:\s*$/m) ? (source.match(/^\s+- id:/gm)?.length ?? 0) : 0;
  return records;
}
