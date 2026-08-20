"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EditDevelopmentLogForm } from "./edit-development-log-form";
import { EditLegacyCleanupForm } from "./edit-legacy-cleanup-form";
import { EditPlannedImprovementForm } from "./edit-planned-improvement-form";
import { EditProposalForm } from "./edit-proposal-form";
import { NewDevelopmentLogForm } from "./new-development-log-form";
import { NewLegacyCleanupForm } from "./new-legacy-cleanup-form";
import { NewPlannedImprovementForm } from "./new-planned-improvement-form";
import { NewProposalForm } from "./new-proposal-form";
import { developmentLogDocumentSchema, legacyCleanupDocumentSchema, plannedImprovementDocumentSchema, proposedImprovementDocumentSchema } from "@/lib/tracking/schema";

type Planned = typeof plannedImprovementDocumentSchema._output.records[number];
type Development = typeof developmentLogDocumentSchema._output.records[number];
type Proposal = typeof proposedImprovementDocumentSchema._output.records[number];
type Legacy = typeof legacyCleanupDocumentSchema._output.records[number];
type View = "planned" | "development" | "proposals" | "legacy";
type Option = { id: string; title?: string; name?: string };
type Context = { project: string; branch: string; expectedBranchCommit: string };
type Props = Context & {
  projectName: string;
  canWrite: boolean;
  branches: { name: string; canPush?: boolean }[];
  catalog: { services: Option[]; components: Option[]; areas: Option[] };
  relationships: { plannedImprovements: Option[]; developmentLogs: Option[]; proposals: Option[]; legacyCleanup: Option[] };
  planned: Planned[];
  development: Development[];
  proposals: Proposal[];
  legacy: Legacy[];
};

type Row = { id: string; title: string; status: string; scope: string; priority?: string };

const views: { id: View; label: string; short: string }[] = [
  { id: "planned", label: "Planned work", short: "01" },
  { id: "development", label: "Development log", short: "02" },
  { id: "proposals", label: "Proposals", short: "03" },
  { id: "legacy", label: "Legacy cleanup", short: "04" },
];

export function TrackingWorkspace(props: Props) {
  const [view, setView] = useState<View>("planned");
  const [selectedId, setSelectedId] = useState<string | null>(props.planned[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const rows = rowsFor(view, props);
  const filtered = useMemo(() => rows.filter((row) => `${row.id} ${row.title}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || row.status === status)), [query, rows, status]);
  const selected = rows.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  function selectView(next: View) {
    setView(next);
    setQuery("");
    setStatus("all");
    setCreating(false);
    setSelectedId(rowsFor(next, props)[0]?.id ?? null);
  }

  return <main className="orbit-app-shell">
    <aside className="orbit-sidebar" aria-label="Tracking navigation">
      <Link className="orbit-brand" href="/">ORBIT</Link>
      <p className="orbit-nav-label">Tracking</p>
      <nav>{views.map((item) => <button key={item.id} className={view === item.id ? "orbit-nav-item active" : "orbit-nav-item"} onClick={() => selectView(item.id)}><b>{item.short}</b><span>{item.label}</span></button>)}</nav>
    </aside>
    <div className="orbit-workspace">
      <header className="orbit-topbar"><div><strong>{props.projectName}</strong><span>Project tracking</span></div><div className="orbit-branch"><span>{props.branch}</span><small>{props.expectedBranchCommit.slice(0, 12)}</small></div></header>
      <div className="orbit-branch-row"><span>Branch</span>{props.branches.map((branch) => <Link key={branch.name} className={branch.name === props.branch ? "active" : ""} href={`/tracking?project=${encodeURIComponent(props.project)}&branch=${encodeURIComponent(branch.name)}`}>{branch.name}{branch.canPush === false ? " · read-only" : ""}</Link>)}</div>
      {!props.canWrite && <p className="orbit-read-only" role="status">This branch is read-only for the connected account.</p>}
      <section className="orbit-records" aria-label={`${labelFor(view)} records`}>
        <div className="orbit-list-heading"><div><h1>{labelFor(view)}</h1><p>{filtered.length} of {rows.length} records</p></div>{props.canWrite && <button className="orbit-primary" onClick={() => setCreating(true)}>New record</button>}</div>
        <div className="orbit-toolbar"><label><span className="sr-only">Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID or title" /></label><label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{[...new Set(rows.map((row) => row.status))].map((value) => <option key={value} value={value}>{labelStatus(value)}</option>)}</select></label></div>
        <div className="orbit-table-wrap"><table><thead><tr><th>Record</th><th>Status</th><th>Priority</th><th>Scope</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className={selected?.id === row.id && !creating ? "selected" : ""}><td><button className="orbit-row-button" onClick={() => { setCreating(false); setSelectedId(row.id); }}><strong>{row.id}</strong><span>{row.title}</span></button></td><td><span className={`orbit-status ${row.status}`}>{labelStatus(row.status)}</span></td><td>{row.priority ? labelStatus(row.priority) : "—"}</td><td>{row.scope || "—"}</td></tr>)}</tbody></table></div>
      </section>
    </div>
    <aside className="orbit-inspector" aria-label="Record inspector">
      <div className="orbit-inspector-heading"><div><strong>{creating ? `New ${labelFor(view).toLowerCase()}` : selected?.id ?? "No record"}</strong><span>{creating ? "Create a branch-local record" : "Edit selected record"}</span></div>{!creating && <button aria-label="Close inspector" onClick={() => setSelectedId(null)}>×</button>}</div>
      <div className="orbit-inspector-body">{props.canWrite ? inspector(view, selected?.id, creating, props) : selected && <ReadOnly record={selected} />}</div>
    </aside>
  </main>;
}

function inspector(view: View, id: string | undefined, creating: boolean, props: Props) {
  const base = { project: props.project, branch: props.branch, expectedBranchCommit: props.expectedBranchCommit, catalog: props.catalog };
  if (creating) {
    if (view === "planned") return <NewPlannedImprovementForm {...base} relationships={{ proposals: props.relationships.proposals, developmentLogs: props.relationships.developmentLogs, legacyCleanup: props.relationships.legacyCleanup }} />;
    if (view === "development") return <NewDevelopmentLogForm {...base} relationships={{ plannedImprovements: props.relationships.plannedImprovements, proposals: props.relationships.proposals, legacyCleanup: props.relationships.legacyCleanup }} />;
    if (view === "proposals") return <NewProposalForm {...base} relationships={{ plannedImprovements: props.relationships.plannedImprovements, developmentLogs: props.relationships.developmentLogs }} />;
    return <NewLegacyCleanupForm {...base} relationships={{ plannedImprovements: props.relationships.plannedImprovements, developmentLogs: props.relationships.developmentLogs }} />;
  }
  if (view === "planned") { const record = props.planned.find((item) => item.id === id); return record && <EditPlannedImprovementForm {...base} record={record} relationships={{ proposals: props.relationships.proposals, developmentLogs: props.relationships.developmentLogs, legacyCleanup: props.relationships.legacyCleanup }} embedded />; }
  if (view === "development") { const record = props.development.find((item) => item.id === id); return record && <EditDevelopmentLogForm {...base} record={record} relationships={{ plannedImprovements: props.relationships.plannedImprovements, proposals: props.relationships.proposals, legacyCleanup: props.relationships.legacyCleanup }} embedded />; }
  if (view === "proposals") { const record = props.proposals.find((item) => item.id === id); return record && <EditProposalForm {...base} record={record} relationships={{ plannedImprovements: props.relationships.plannedImprovements, developmentLogs: props.relationships.developmentLogs }} embedded />; }
  const record = props.legacy.find((item) => item.id === id);
  return record && <EditLegacyCleanupForm {...base} record={record} relationships={{ plannedImprovements: props.relationships.plannedImprovements, developmentLogs: props.relationships.developmentLogs }} embedded />;
}

function rowsFor(view: View, props: Props): Row[] {
  if (view === "planned") return props.planned.map((record) => ({ id: record.id, title: record.title, status: record.status, priority: record.priority, scope: record.scope.services[0] ?? record.scope.areas[0] ?? "" }));
  if (view === "development") return props.development.map((record) => ({ id: record.id, title: record.title, status: "completed", scope: record.scope.services[0] ?? record.scope.areas[0] ?? "" }));
  if (view === "proposals") return props.proposals.map((record) => ({ id: record.id, title: record.title, status: record.status, scope: record.scope.services[0] ?? record.scope.areas[0] ?? "" }));
  return props.legacy.map((record) => ({ id: record.id, title: record.title, status: record.status, scope: record.scope.services[0] ?? record.scope.areas[0] ?? "" }));
}

function labelFor(view: View) { return views.find((item) => item.id === view)?.label ?? "Records"; }
function labelStatus(value: string) { return value.replaceAll("_", " "); }
function ReadOnly({ record }: { record: Row }) { return <div className="orbit-read-only-record"><p>{record.title}</p><span>{labelStatus(record.status)}</span></div>; }
