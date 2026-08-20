"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = { id: string; name?: string; title?: string };
type Props = { label: string; options: Option[]; value: string[]; onChange: (value: string[]) => void };

export function MultiSelectField({ label, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const manageButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const selected = options.filter((option) => value.includes(option.id));
  const matching = useMemo(() => options.filter((option) => `${option.id} ${option.name ?? option.title ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [options, query]);
  const available = matching.filter((option) => !value.includes(option.id));

  useEffect(() => {
    if (wasOpen.current && !open) manageButton.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return <div className="multi-select-field">
    <div className="multi-select-label"><span>{label}</span><button ref={manageButton} type="button" onClick={() => setOpen(true)}>Manage{value.length ? ` (${value.length})` : ""}</button></div>
    {selected.length > 0 && <ul className="selected-summary" aria-label={`Selected ${label}`}>
      {selected.slice(0, 2).map((option) => <li key={option.id}><RecordLabel option={option} /><button type="button" aria-label={`Remove ${option.id}`} onClick={() => toggle(option.id)}>×</button></li>)}
      {selected.length > 2 && <li className="more-selected">+{selected.length - 2} more selected</li>}
    </ul>}
    {open && <div className="relation-picker" role="dialog" aria-modal="true" aria-label={`Manage ${label}`}>
      <div className="relation-picker-head"><div><strong>{label}</strong><span>Search and select without modifier keys.</span></div><button type="button" aria-label={`Close ${label}`} onClick={() => setOpen(false)}>×</button></div>
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID or title" aria-label={`Search ${label}`} />
      <div className="relation-picker-columns">
        <div><header><span>Available</span><small>{available.length}</small></header><div className="picker-options">{available.length ? available.map((option) => <label key={option.id}><RecordLabel option={option} /><input type="checkbox" checked={false} onChange={() => toggle(option.id)} /></label>) : <p>No matching records.</p>}</div></div>
        <div><header><span>Selected</span><button type="button" onClick={() => onChange([])}>Clear all</button></header><div className="picker-options selected">{selected.length ? selected.map((option) => <div key={option.id}><RecordLabel option={option} /><button type="button" aria-label={`Remove ${option.id}`} onClick={() => toggle(option.id)}>×</button></div>) : <p>No selected records.</p>}</div></div>
      </div>
      <footer><span>{value.length} selected</span><button type="button" className="orbit-primary" onClick={() => setOpen(false)}>Apply selection</button></footer>
    </div>}
  </div>;
}

function RecordLabel({ option }: { option: Option }) {
  const description = option.name ?? option.title;
  return <span className="record-label"><b>{option.id}</b>{description && description !== option.id ? <small>{description}</small> : null}</span>;
}
