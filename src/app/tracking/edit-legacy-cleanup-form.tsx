"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { legacyCleanupDocumentSchema } from "@/lib/tracking/schema";
import { MultiSelectField } from "./multi-select-field";

type LegacyCleanup = typeof legacyCleanupDocumentSchema._output.records[number];
type Option = { id: string; name?: string; title?: string };
type Props = {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  record: LegacyCleanup;
  catalog: { services: Option[]; components: Option[]; areas: Option[] };
  relationships: { plannedImprovements: Option[]; developmentLogs: Option[] };
  embedded?: boolean;
};

export function EditLegacyCleanupForm({ project, branch, expectedBranchCommit, record, catalog, relationships, embedded = false }: Props) {
  const router = useRouter();
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
    setMessage("Saved. Refreshing the record list…");
    router.refresh();
  }

  const form = <><form className="tracking-form" onSubmit={save}>
      <Text label="Title" value={title} setValue={setTitle} />
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{(record.status === "removed" ? ["removed"] : ["planned", "active"]).map((value) => <option key={value}>{value}</option>)}</select></label>
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
    {record.status !== "removed" && <CloseLegacyCleanupForm
      project={project}
      branch={branch}
      expectedBranchCommit={expectedBranchCommit}
      record={record}
      developmentLogs={relationships.developmentLogs}
  />}</>;
  return embedded ? form : <details><summary>{record.id} — {record.title}</summary>{form}</details>;
}

function CloseLegacyCleanupForm({ project, branch, expectedBranchCommit, record, developmentLogs }: {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  record: LegacyCleanup;
  developmentLogs: Option[];
}) {
  const router = useRouter();
  const [evidence, setEvidence] = useState(record.removal.evidence ?? "");
  const [developmentLogIds, setDevelopmentLogIds] = useState(record.relationships.developmentLogIds);
  const [message, setMessage] = useState<string>();

  async function close(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/tracking/legacy-cleanup/close", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project, branch, expectedBranchCommit, id: record.id, evidence, developmentLogIds }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Closure failed.");
    setMessage("Closed. Refreshing the record list…");
    router.refresh();
  }

  return <form className="tracking-form" onSubmit={close}>
    <h3>Close legacy cleanup</h3>
    <p>Save any ordinary edits first. Closing is permanent: the record remains, but cannot be reopened.</p>
    <Text label="Removal evidence" value={evidence} setValue={setEvidence} />
    <Choices label="Development logs proving removal" options={developmentLogs} value={developmentLogIds} setValue={setDevelopmentLogIds} />
    <button>Close legacy cleanup</button>
    {message && <p role="status">{message}</p>}
  </form>;
}

function Text({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label>{label}<textarea required value={value} onChange={(event) => setValue(event.target.value)} /></label>;
}

function Choices({ label, options, value, setValue }: { label: string; options: Option[]; value: string[]; setValue: (value: string[]) => void }) { return <MultiSelectField label={label} options={options} value={value} onChange={setValue} />; }
