"use client";

import { useState } from "react";

type Option = { id: string; title?: string; name?: string };
type Props = { project: string; branch: string; expectedBranchCommit: string; catalog: { services: Option[]; components: Option[]; areas: Option[] }; relationships: { proposals: Option[]; developmentLogs: Option[]; legacyCleanup: Option[] } };
const categories = ["architecture", "data_integrity", "database_safety", "developer_experience", "documentation", "operational", "reliability", "security", "testing"];

function selected(event: React.ChangeEvent<HTMLSelectElement>) { return Array.from(event.target.selectedOptions, (option) => option.value); }

export function NewPlannedImprovementForm({ project, branch, expectedBranchCommit, catalog, relationships }: Props) {
  const [title, setTitle] = useState(""); const [summary, setSummary] = useState(""); const [goal, setGoal] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium"); const [status, setStatus] = useState<"backlog" | "in_progress" | "blocked" | "completed">("backlog");
  const [categoriesValue, setCategories] = useState<string[]>(["developer_experience"]); const [services, setServices] = useState<string[]>([]); const [components, setComponents] = useState<string[]>([]); const [areas, setAreas] = useState<string[]>([]);
  const [proposalIds, setProposalIds] = useState<string[]>([]); const [developmentLogIds, setDevelopmentLogIds] = useState<string[]>([]); const [legacyCleanupIds, setLegacyCleanupIds] = useState<string[]>([]); const [message, setMessage] = useState<string>(); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(undefined);
    const response = await fetch("/api/tracking/planned-improvements", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, branch, expectedBranchCommit, record: { title, summary, goal, priority, status, categories: categoriesValue, scope: { services, components, areas }, relationships: { proposalIds, developmentLogIds, legacyCleanupIds } } }) });
    const result = await response.json() as { error?: string }; setSaving(false);
    if (!response.ok) { setMessage(result.error ?? "Tracking update failed."); return; }
    window.location.reload();
  }
  function invent() {
    const stamp = Math.random().toString(36).slice(2, 7);
    setTitle(`Synthetic wobble ${stamp}`); setSummary(`A deliberately meaningless tracking summary ${stamp}.`); setGoal(`Keep the imaginary ${stamp} path suitably wobblish.`);
    setPriority(["low", "medium", "high"][Math.floor(Math.random() * 3)] as typeof priority); setStatus("backlog");
    setCategories([pick(categories)]); setServices(one(catalog.services)); setComponents(one(catalog.components)); setAreas(one(catalog.areas));
    setProposalIds(one(relationships.proposals)); setDevelopmentLogIds(one(relationships.developmentLogs)); setLegacyCleanupIds(one(relationships.legacyCleanup));
  }
  return <form onSubmit={submit} className="tracking-form">
    <button type="button" className="secondary" onClick={invent}>Yeni uydur</button>
    <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Summary<textarea required value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
    <label>Goal<textarea required value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
    <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
    <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="backlog">backlog</option><option value="in_progress">in_progress</option><option value="blocked">blocked</option></select></label>
    <Choice label="Categories" options={categories.map((id) => ({ id, name: id }))} value={categoriesValue} onChange={setCategories} />
    <Choice label="Services" options={catalog.services} value={services} onChange={setServices} />
    <Choice label="Components" options={catalog.components} value={components} onChange={setComponents} />
    <Choice label="Areas" options={catalog.areas} value={areas} onChange={setAreas} />
    <Choice label="Proposals" options={relationships.proposals} value={proposalIds} onChange={setProposalIds} />
    <Choice label="Development logs" options={relationships.developmentLogs} value={developmentLogIds} onChange={setDevelopmentLogIds} />
    <Choice label="Legacy cleanup" options={relationships.legacyCleanup} value={legacyCleanupIds} onChange={setLegacyCleanupIds} />
    <button type="submit" disabled={saving}>{saving ? "Saving…" : "Create planned improvement"}</button>{message ? <p role="status">{message}</p> : null}
  </form>;
}

function pick<T>(items: T[]) { return items[Math.floor(Math.random() * items.length)]; }
function one(items: Option[]) { return items.length ? [pick(items).id] : []; }

function Choice({ label, options, value, onChange }: { label: string; options: Option[]; value: string[]; onChange: (value: string[]) => void }) {
  return <label>{label}<select multiple value={value} onChange={(event) => onChange(selected(event))}>{options.map((option) => <option key={option.id} value={option.id}>{option.id} — {option.title ?? option.name}</option>)}</select></label>;
}
