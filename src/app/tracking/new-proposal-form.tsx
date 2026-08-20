"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MultiSelectField } from "./multi-select-field";

type Option = { id: string; name?: string; title?: string };
type Props = {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  catalog: { services: Option[]; components: Option[]; areas: Option[] };
  relationships: { plannedImprovements: Option[]; developmentLogs: Option[] };
};

export function NewProposalForm({ project, branch, expectedBranchCommit, catalog, relationships }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rationale, setRationale] = useState("");
  const [content, setContent] = useState("");
  const [decisionQuestions, setDecisionQuestions] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [components, setComponents] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [plannedImprovementIds, setPlannedImprovementIds] = useState<string[]>([]);
  const [developmentLogIds, setDevelopmentLogIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/tracking/proposals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project, branch, expectedBranchCommit,
        record: {
          title, status: "under_review", summary, rationale, content,
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

  return <form className="tracking-form" onSubmit={save}>
    <Text label="Title" value={title} setValue={setTitle} />
    <Text label="Summary" value={summary} setValue={setSummary} />
    <Text label="Rationale" value={rationale} setValue={setRationale} />
    <Text label="Content" value={content} setValue={setContent} />
    <Text label="Decision questions (one per line)" value={decisionQuestions} setValue={setDecisionQuestions} required={false} />
    <Choices label="Services" options={catalog.services} value={services} setValue={setServices} />
    <Choices label="Components" options={catalog.components} value={components} setValue={setComponents} />
    <Choices label="Areas" options={catalog.areas} value={areas} setValue={setAreas} />
    <Choices label="Related planned improvements" options={relationships.plannedImprovements} value={plannedImprovementIds} setValue={setPlannedImprovementIds} />
    <Choices label="Related development logs" options={relationships.developmentLogs} value={developmentLogIds} setValue={setDevelopmentLogIds} />
    <button>Create proposal</button>
    {message && <p role="status">{message}</p>}
  </form>;
}

function lines(value: string) { return value.split("\n").map((line) => line.trim()).filter(Boolean); }

function Text({ label, value, setValue, required = true }: { label: string; value: string; setValue: (value: string) => void; required?: boolean }) {
  return <label>{label}<textarea required={required} value={value} onChange={(event) => setValue(event.target.value)} /></label>;
}

function Choices({ label, options, value, setValue }: { label: string; options: Option[]; value: string[]; setValue: (value: string[]) => void }) {
  return <MultiSelectField label={label} options={options} value={value} onChange={setValue} />;
}
