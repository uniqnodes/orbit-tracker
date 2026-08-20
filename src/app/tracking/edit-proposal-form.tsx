"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { proposedImprovementDocumentSchema } from "@/lib/tracking/schema";
import { MultiSelectField } from "./multi-select-field";

type Proposal = typeof proposedImprovementDocumentSchema._output.records[number];
type Option = { id: string; name?: string; title?: string };
type Props = {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  record: Proposal;
  catalog: { services: Option[]; components: Option[]; areas: Option[] };
  relationships: { plannedImprovements: Option[]; developmentLogs: Option[] };
  embedded?: boolean;
};

export function EditProposalForm({ project, branch, expectedBranchCommit, record, catalog, relationships, embedded = false }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(record.title);
  const [summary, setSummary] = useState(record.summary);
  const [rationale, setRationale] = useState(record.rationale);
  const [content, setContent] = useState(record.content);
  const [status, setStatus] = useState(record.status);
  const [decisionQuestions, setDecisionQuestions] = useState(record.decisionQuestions.join("\n"));
  const [services, setServices] = useState(record.scope.services);
  const [components, setComponents] = useState(record.scope.components);
  const [areas, setAreas] = useState(record.scope.areas);
  const [plannedImprovementIds, setPlannedImprovementIds] = useState(record.relationships.plannedImprovementIds);
  const [developmentLogIds, setDevelopmentLogIds] = useState(record.relationships.developmentLogIds);
  const [message, setMessage] = useState<string>();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/tracking/proposals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project, branch, expectedBranchCommit,
        record: {
          id: record.id, title, status, summary, rationale, content,
          decisionQuestions: lines(decisionQuestions),
          scope: { services, components, areas },
          relationships: { plannedImprovementIds, developmentLogIds },
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Save failed.");
    setMessage("Saved. Refreshing the record list…");
    router.refresh();
  }

  const form = <form className="tracking-form" onSubmit={save}>
      <Text label="Title" value={title} setValue={setTitle} />
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{["under_review", "accepted", "rejected", "deferred"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <Text label="Summary" value={summary} setValue={setSummary} />
      <Text label="Rationale" value={rationale} setValue={setRationale} />
      <Text label="Content" value={content} setValue={setContent} />
      <Text label="Decision questions (one per line)" value={decisionQuestions} setValue={setDecisionQuestions} required={false} />
      <Choices label="Services" options={catalog.services} value={services} setValue={setServices} />
      <Choices label="Components" options={catalog.components} value={components} setValue={setComponents} />
      <Choices label="Areas" options={catalog.areas} value={areas} setValue={setAreas} />
      <Choices label="Related planned improvements" options={relationships.plannedImprovements} value={plannedImprovementIds} setValue={setPlannedImprovementIds} />
      <Choices label="Related development logs" options={relationships.developmentLogs} value={developmentLogIds} setValue={setDevelopmentLogIds} />
      <button>Save proposal</button>
      {message && <p role="status">{message}</p>}
  </form>;
  return embedded ? form : <details><summary>{record.id} — {record.title}</summary>{form}</details>;
}

function lines(value: string) { return value.split("\n").map((line) => line.trim()).filter(Boolean); }

function Text({ label, value, setValue, required = true }: { label: string; value: string; setValue: (value: string) => void; required?: boolean }) {
  return <label>{label}<textarea required={required} value={value} onChange={(event) => setValue(event.target.value)} /></label>;
}

function Choices({ label, options, value, setValue }: { label: string; options: Option[]; value: string[]; setValue: (value: string[]) => void }) { return <MultiSelectField label={label} options={options} value={value} onChange={setValue} />; }
