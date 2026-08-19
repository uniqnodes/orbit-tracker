"use client";

import { useState } from "react";

type Status = "backlog" | "in_progress" | "blocked" | "completed";

type Props = {
  project: string;
  branch: string;
  expectedBranchCommit: string;
  record: { id: string; title: string; status: Status };
};

const statuses: Status[] = ["backlog", "in_progress", "blocked", "completed"];

export function PlannedStatusForm({ project, branch, expectedBranchCommit, record }: Props) {
  const [status, setStatus] = useState(record.status);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(undefined);
    const response = await fetch("/api/tracking/planned-improvements", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project, branch, expectedBranchCommit, recordId: record.id, status }),
    });
    const result = await response.json() as { error?: string; branch?: { commit: string } };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Tracking update failed.");
      return;
    }
    setMessage(`Saved in commit ${result.branch?.commit.slice(0, 12) ?? "created"}. Reloading…`);
    window.location.reload();
  }

  return <li>
    <strong>{record.id}</strong> — {record.title}
    <label>
      Status
      <select value={status} onChange={(event) => setStatus(event.target.value as Status)} disabled={saving}>
        {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <button type="button" onClick={save} disabled={saving || status === record.status}>{saving ? "Saving…" : "Save status"}</button>
    {message ? <p role="status">{message}</p> : null}
  </li>;
}
