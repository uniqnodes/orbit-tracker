"use client";

import { useState } from "react";

type Option = { id: string; name?: string; title?: string };
type Props = {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  catalog: { services: Option[]; components: Option[]; areas: Option[] };
  relationships: { plannedImprovements: Option[]; developmentLogs: Option[] };
};

export function NewLegacyCleanupForm({ project, branch, expectedBranchCommit, catalog, relationships }: Props) {
  const [title, setTitle] = useState("");
  const [legacyPath, setLegacyPath] = useState("");
  const [reasonRetained, setReasonRetained] = useState("");
  const [introductionDescription, setIntroductionDescription] = useState("");
  const [removalCondition, setRemovalCondition] = useState("");
  const [ownerDescription, setOwnerDescription] = useState("Manual tracking entry");
  const [services, setServices] = useState<string[]>([]);
  const [components, setComponents] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [plannedImprovementIds, setPlannedImprovementIds] = useState<string[]>([]);
  const [developmentLogIds, setDevelopmentLogIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/tracking/legacy-cleanup", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project, branch, expectedBranchCommit,
        record: {
          title, status: "planned", legacyPath, reasonRetained, introductionDescription,
          removalCondition, ownerDescription, plannedImprovementIds,
          scope: { services, components, areas }, developmentLogIds,
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Save failed.");
    window.location.reload();
  }

  return <form className="tracking-form" onSubmit={save}>
    <Text label="Title" value={title} setValue={setTitle} />
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
    <button>Create legacy cleanup</button>
    {message && <p role="status">{message}</p>}
  </form>;
}

function Text({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label>{label}<textarea required value={value} onChange={(event) => setValue(event.target.value)} /></label>;
}

function Choices({ label, options, value, setValue }: { label: string; options: Option[]; value: string[]; setValue: (value: string[]) => void }) {
  return <label>{label}<select multiple value={value} onChange={(event) => setValue(Array.from(event.target.selectedOptions, (option) => option.value))}>
    {options.map((option) => <option key={option.id} value={option.id}>{option.id} — {option.name ?? option.title}</option>)}
  </select></label>;
}
