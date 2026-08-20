import { cookies } from "next/headers";
import Link from "next/link";
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
  const { branches, snapshot } = await loadTrackingSnapshot({ project, accessToken: session.token.accessToken, branchName: query.branch });
  const workspace = buildTrackingWorkspace(snapshot);
  const planned = plannedImprovementDocumentSchema.parse(parse(snapshot.sources.plannedImprovements));
  const proposals = proposedImprovementDocumentSchema.parse(parse(snapshot.sources.proposedImprovements));
  const developmentLogs = developmentLogDocumentSchema.parse(parse(snapshot.sources.developmentLog));
  const legacyCleanup = legacyCleanupDocumentSchema.parse(parse(snapshot.sources.legacyCleanup));
  const context = { project: project.slug, branch: snapshot.branch.name, expectedBranchCommit: snapshot.branch.commit };
  const canWrite = snapshot.branch.canPush !== false;
  const overview = [
    { label: "Planned work", value: planned.records.length, href: "#planned-improvements" },
    { label: "Development log", value: developmentLogs.records.length, href: "#development-log" },
    { label: "Proposals", value: proposals.records.length, href: "#proposals" },
    { label: "Legacy cleanup", value: legacyCleanup.records.length, href: "#legacy-cleanup" },
  ];
  return <main className="app-shell tracking-page">
    <header className="workspace-header">
      <div>
        <Link className="brand" href="/">ORBIT</Link>
        <p className="eyebrow">Project tracking workspace</p>
        <h1>{snapshot.manifest.project.name}</h1>
        <p className="lede">A branch-aware view of the project’s work, decisions, evidence, and retained legacy paths.</p>
      </div>
      <div className="branch-context" aria-label="Selected branch">
        <span>Selected branch</span>
        <strong>{snapshot.branch.name}</strong>
        <small>{snapshot.branch.commit.slice(0, 12)}</small>
      </div>
    </header>

    <nav className="overview-grid" aria-label="Tracking record types">
      {overview.map((item) => <Link className="overview-card" href={item.href} key={item.label}>
        <span>{item.label}</span><strong>{item.value}</strong><small>View records</small>
      </Link>)}
    </nav>

    <section className="branch-panel" aria-labelledby="branch-heading">
      <div><p className="section-kicker">Safe write boundary</p><h2 id="branch-heading">Choose a branch</h2><p>Every save becomes an auditable commit on this branch. ORBIT reloads instead of overwriting if the branch changes first.</p></div>
      <nav className="branch-list" aria-label="Tracking branches">{branches.map((branch) => <Link key={branch.name} className={branch.name === snapshot.branch.name ? "button" : "secondary button"} href={`/tracking?project=${encodeURIComponent(project.slug)}&branch=${encodeURIComponent(branch.name)}`}>{branch.name}{branch.canPush === false ? " · read-only" : ""}</Link>)}</nav>
    </section>

    {!canWrite && <p className="notice" role="status">This branch is read-only for the connected account.</p>}
    {canWrite && <section className="create-panel" aria-labelledby="create-heading">
      <div className="section-heading"><div><p className="section-kicker">Guided entry</p><h2 id="create-heading">Add a record</h2><p>Start only the form you need. ORBIT uses the current branch’s services and relationships.</p></div></div>
      <div className="create-grid">
        <details><summary><span>Planned improvement</span><small>Accepted work to schedule</small></summary><NewPlannedImprovementForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></details>
        <details><summary><span>Development log</span><small>Evidence of completed work</small></summary><NewDevelopmentLogForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></details>
        <details><summary><span>Proposal</span><small>An unapproved option</small></summary><NewProposalForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></details>
        <details><summary><span>Legacy cleanup</span><small>A path retained until removal</small></summary><NewLegacyCleanupForm {...context} catalog={workspace.catalog} relationships={workspace.relationships} /></details>
      </div>
    </section>}

    <section className="record-section" id="planned-improvements"><SectionHeading title="Planned improvements" count={planned.records.length} description="Accepted work items and their linked evidence." /><div className="record-list">{planned.records.map((record) => canWrite ? <EditPlannedImprovementForm key={record.id} {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} /> : <p key={record.id}>{record.id} — {record.title}</p>)}</div></section>
    <section className="record-section" id="development-log"><SectionHeading title="Development log" count={developmentLogs.records.length} description="Completed changes with their reason and scope." /><ul className="record-list">{developmentLogs.records.map((record) => <li key={record.id}>{canWrite ? <EditDevelopmentLogForm {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} /> : `${record.id} — ${record.title}`}</li>)}</ul></section>
    <section className="record-section" id="proposals"><SectionHeading title="Proposals" count={proposals.records.length} description="Options that have not yet become planned work." /><ul className="record-list">{proposals.records.map((record) => <li key={record.id}>{canWrite ? <EditProposalForm {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} /> : `${record.id} — ${record.title}`}</li>)}</ul></section>
    <section className="record-section" id="legacy-cleanup"><SectionHeading title="Legacy cleanup" count={legacyCleanup.records.length} description="Retained paths and the evidence required to close them." /><ul className="record-list">{legacyCleanup.records.map((record) => <li key={record.id}>{canWrite ? <EditLegacyCleanupForm {...context} record={record} catalog={workspace.catalog} relationships={workspace.relationships} /> : `${record.id} — ${record.title}`}</li>)}</ul></section>
  </main>;
}

function SectionHeading({ title, count, description }: { title: string; count: number; description: string }) {
  return <div className="section-heading"><div><h2>{title}</h2><p>{description}</p></div><span className="count-badge">{count}</span></div>;
}
