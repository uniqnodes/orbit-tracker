"use client";

import { useState } from "react";
import { legacyCleanupDocumentSchema } from "@/lib/tracking/schema";

type LegacyCleanup = typeof legacyCleanupDocumentSchema._output.records[number];
type Option = { id: string; name?: string; title?: string };
type Props = {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  record: LegacyCleanup;
  catalog: { services: Option[]; components: Option[]; areas: Option[] };
  relationships: { plannedImprovements: Option[]; developmentLogs: Option[] };
};

export function EditLegacyCleanupForm({ project, branch, expectedBranchCommit, record, catalog, relationships }: Props) {
  const [title, setTitle] = useState(record.title);
  const [status, setStatus] = useState(record.status);
  const [legacyPath, setLegacyPath] = useState(record.legacyPath);
  const [reasonRetained, setReasonRetained] = useState(record.reasonRetained);
  const [introductionDescription, setIntroductionDescription] = useState(record.introduction.description);
  const [removalCondition, setRemovalCondition] = useState(record.removal.condition);
  const [ownerDescription, setOwnerDescription] = useState(record.owner.description);
  const [services, setServices] = useState(record.scope.services);
  const [components, setComponents] = useState(record.scope.components);
  const [areas, setAreas] = useState(record.scope.areas);
  const [plannedImprovementIds, setPlannedImprovementIds] = useState(record.owner.plannedImprovementIds);
  const [developmentLogIds, setDevelopmentLogIds] = useState(record.relationships.developmentLogIds);
  const [message, setMessage] = useState<string>();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/tracking/legacy-cleanup", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project, branch, expectedBranchCommit,
        record: {
          id: record.id, title, status, legacyPath, reasonRetained, introductionDescription,
          removalCondition, ownerDescription, plannedImprovementIds,
          scope: { services, components, areas }, developmentLogIds,
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Save failed.");
    window.location.reload();
  }

  return <details>
    <summary>{record.id} — {record.title}</summary>
    <form className="tracking-form" onSubmit={save}>
      <Text label="Title" value={title} setValue={setTitle} />
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{["planned", "active", "removed"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <Text label="Legacy path" value={legacyPath} setValue={setLegacyPath} />
      <Text label="Reason retained" value={reasonRetained} setValue={setReasonRetained} />
      <Text label="Introduction" value={introductionDescription} setValue={setIntroductionDescription} />
      <Text label="Removal condition" value={removalCondition} setValue={setRemovalCondition} />
      <Text label="Owner description" value={ownerDescription} setValue={setOwnerDescription} />
      <Choices label="Services" options={catalog.services} value={services} setValue={setServices} />
      <Choices label="Components" options={catalog.components} value={components} setValue={setComponents} />
      <Choices label="Areas" options={catalog.areas} value={areas} setValue={setAreas} />
      <Choices label="Owning planned improvements" options={relationships.plannedImprovements} value={plannedImprovementIds} setValue={setPlannedImprovementIds} />
      <Choices label="Related development logs" options={relationships.developmentLogs} value={developmentLogIds} setValue={setDevelopmentLogIds} />
      <button>Save legacy cleanup</button>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}

function Text({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label>{label}<textarea required value={value} onChange={(event) => setValue(event.target.value)} /></label>;
}

function Choices({ label, options, value, setValue }: { label: string; options: Option[]; value: string[]; setValue: (value: string[]) => void }) {
  return <label>{label}<select multiple value={value} onChange={(event) => setValue(Array.from(event.target.selectedOptions, (option) => option.value))}>
    {options.map((option) => <option key={option.id} value={option.id}>{option.id} — {option.name ?? option.title}</option>)}
  </select></label>;
}
