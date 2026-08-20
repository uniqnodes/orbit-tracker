"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { developmentLogDocumentSchema } from "@/lib/tracking/schema";
import { MultiSelectField } from "./multi-select-field";

type DevelopmentLog = typeof developmentLogDocumentSchema._output.records[number];
type Option = { id: string; name?: string; title?: string };
type Props = {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  record: DevelopmentLog;
  catalog: { services: Option[]; components: Option[]; areas: Option[] };
  relationships: { plannedImprovements: Option[]; proposals: Option[]; legacyCleanup: Option[] };
  embedded?: boolean;
};

export function EditDevelopmentLogForm({ project, branch, expectedBranchCommit, record, catalog, relationships, embedded = false }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(record.title);
  const [details, setDetails] = useState(record.details);
  const [categories, setCategories] = useState(record.categories);
  const [reasonType, setReasonType] = useState(record.reason.type);
  const [reasonSummary, setReasonSummary] = useState(record.reason.summary);
  const [systemImpact, setSystemImpact] = useState(record.systemImpact.join("\n"));
  const [services, setServices] = useState(record.scope.services);
  const [components, setComponents] = useState(record.scope.components);
  const [areas, setAreas] = useState(record.scope.areas);
  const [plannedImprovementIds, setPlannedImprovementIds] = useState(record.relationships.plannedImprovementIds);
  const [proposalIds, setProposalIds] = useState(record.relationships.proposalIds);
  const [legacyCleanupIds, setLegacyCleanupIds] = useState(record.relationships.legacyCleanupIds);
  const [message, setMessage] = useState<string>();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/tracking/development-log", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project, branch, expectedBranchCommit,
        record: {
          id: record.id, title, categories, reasonType, reasonSummary, details,
          systemImpact: systemImpact.split("\n").map((value) => value.trim()).filter(Boolean),
          scope: { services, components, areas },
          relationships: { plannedImprovementIds, proposalIds, legacyCleanupIds },
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
      <Choices label="Categories" options={categoriesForForm} value={categories} setValue={(values) => setCategories(values as typeof categories)} />
      <Text label="Reason type" value={reasonType} setValue={setReasonType} />
      <Text label="Reason summary" value={reasonSummary} setValue={setReasonSummary} />
      <Text label="Details" value={details} setValue={setDetails} />
      <Text label="System impact (one item per line)" value={systemImpact} setValue={setSystemImpact} />
      <Choices label="Services" options={catalog.services} value={services} setValue={setServices} />
      <Choices label="Components" options={catalog.components} value={components} setValue={setComponents} />
      <Choices label="Areas" options={catalog.areas} value={areas} setValue={setAreas} />
      <Choices label="Planned improvements" options={relationships.plannedImprovements} value={plannedImprovementIds} setValue={setPlannedImprovementIds} />
      <Choices label="Proposals" options={relationships.proposals} value={proposalIds} setValue={setProposalIds} />
      <Choices label="Legacy cleanup" options={relationships.legacyCleanup} value={legacyCleanupIds} setValue={setLegacyCleanupIds} />
      <button>Save development log</button>
      {message && <p role="status">{message}</p>}
  </form>;
  return embedded ? form : <details><summary>{record.id} — {record.title}</summary>{form}</details>;
}

const categoriesForForm = ["architecture", "bug_fix", "database_safety", "developer_experience", "documentation", "operational", "reliability", "security", "system_improvement"].map((id) => ({ id, name: id }));

function Text({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label>{label}<textarea required value={value} onChange={(event) => setValue(event.target.value)} /></label>;
}

function Choices({ label, options, value, setValue }: { label: string; options: Option[]; value: string[]; setValue: (value: string[]) => void }) { return <MultiSelectField label={label} options={options} value={value} onChange={setValue} />; }
