import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../shared/schema";
import type { PlacementResponse } from "../../shared/api";
import { cellId } from "../../shared/api";
import { cellById, client, intake, meridianAnswers } from "../content";
import { defaultProfile, exportRecord, importRecord, recordFileName, recordToCsv, type RecordState } from "../lib/record";
import { downloadText } from "../lib/markdown";
import { Button, cx, Icon, SectionLabel } from "./ui";

const fields: { key: keyof Profile; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "name", label: "Customer name", wide: true },
  { key: "industry", label: "Industry" },
  { key: "revenue", label: "Revenue", placeholder: "e.g. About $600M" },
  { key: "technicians", label: "Field technicians" },
  { key: "branches", label: "Service branches or locations" },
  { key: "systems", label: "Systems in use today", wide: true },
  { key: "contact", label: "Primary contact and role", wide: true },
];

interface Props {
  record: RecordState;
  placement?: PlacementResponse;
  setProfile: (p: Profile) => void;
  setNotes: (n: string) => void;
  onLoad: (r: RecordState) => void;
  saved: RecordState | null;
  onDiscardSaved: () => void;
  onClose: () => void;
}

export function RecordPanel({ record, placement, setProfile, setNotes, onLoad, saved, onDiscardSaved, onClose }: Props) {
  const firstField = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const claimedCell = cellById(cellId(record.claimed.row, record.claimed.column));
  const actualCell = placement ? cellById(placement.cell) : undefined;
  const noteCount = Object.values(record.questionNotes).filter((n) => n.trim()).length;
  const exportAs = (kind: "json" | "csv") => {
    const rec = exportRecord(record, placement);
    if (kind === "json") downloadText(recordFileName(record.profile, "json"), JSON.stringify(rec, null, 2) + "\n", "application/json");
    else downloadText(recordFileName(record.profile, "csv"), recordToCsv(rec), "text/csv;charset=utf-8");
    setMessage(`Exported ${kind.toUpperCase()}. File it with the customer's other records.`);
  };
  const open = async (file?: File) => {
    if (!file) return;
    try {
      onLoad(importRecord(await file.text(), record));
      setMessage(`Opened ${file.name}.`);
    } catch (err) {
      setMessage(`Could not open that file: ${(err as Error).message}.`);
    }
  };
  const newCustomer = () =>
    onLoad({
      profile: { name: "New customer", industry: "", revenue: "", technicians: "", branches: "", systems: "", contact: "" },
      claimed: { ...intake.claim.meridian },
      answers: { ...meridianAnswers },
      questionNotes: {},
      notes: "",
    });
  const backToDemo = () =>
    onLoad({ profile: defaultProfile(), claimed: { ...intake.claim.meridian }, answers: { ...meridianAnswers }, questionNotes: {}, notes: "" });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="record-title">
      <button type="button" aria-label="Close customer record" className="absolute inset-0 bg-[#00153d]/50" onClick={onClose} />
      <aside className="animate-rise relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line bg-surface-2 px-5 py-4">
          <div>
            <h2 id="record-title" className="text-lg font-bold text-ink">
              Customer record
            </h2>
            <p className="mt-0.5 text-xs text-muted">{client.record.notice}</p>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close" className="-mr-2">
            ×
          </Button>
        </header>

        <div className="space-y-6 px-5 py-5">
          {saved && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2.5 text-sm">
              <span>
                A saved copy of <span className="font-semibold">{saved.profile.name}</span> is in this browser.
              </span>
              <span className="flex gap-3 text-xs font-semibold">
                <button type="button" onClick={() => onLoad(saved)} className="text-accent-text hover:underline">
                  Resume it
                </button>
                <button type="button" onClick={onDiscardSaved} className="text-muted hover:underline">
                  Discard
                </button>
              </span>
            </div>
          )}
          <section>
            <SectionLabel>Facts and figures</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {fields.map((f, i) => (
                <label key={f.key} className={cx("block text-sm", f.wide && "sm:col-span-2")}>
                  <span className="mb-1 block text-xs font-semibold text-muted">{f.label}</span>
                  <input
                    ref={i === 0 ? firstField : undefined}
                    value={record.profile[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setProfile({ ...record.profile, [f.key]: e.target.value })}
                    className="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-ink focus:border-accent"
                  />
                </label>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Placement</SectionLabel>
            <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="font-semibold">Says</dt>
              <dd>{claimedCell?.title}</dd>
              <dt className="font-semibold">Does</dt>
              <dd>{actualCell?.title ?? "Waiting for placement"}</dd>
              <dt className="font-semibold">Gap</dt>
              <dd>{!actualCell ? "" : actualCell.id === claimedCell?.id ? "None. Says and does agree." : "Yes. This is the engagement."}</dd>
            </dl>
            <p className="mt-2 text-xs text-muted">
              {intake.questions.length} intake answers and {noteCount} question-set {noteCount === 1 ? "note" : "notes"} are included. Add notes on the Question Set tab.
            </p>
          </section>

          <section>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">General notes</span>
              <textarea
                value={record.notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Context, stakeholders, next steps"
                className="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-ink focus:border-accent"
              />
            </label>
          </section>
        </div>

        <footer className="mt-auto space-y-3 border-t border-line bg-surface-2 px-5 py-4">
          {message && (
            <p className="text-sm text-ink" role="status">
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => exportAs("json")} className="inline-flex items-center gap-1.5 rounded bg-accent-text px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 dark:bg-accent dark:text-accent-ink">
              <Icon name="download" /> Export JSON
            </button>
            <button type="button" onClick={() => exportAs("csv")} className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2">
              <Icon name="download" /> Export CSV
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2">
              Reimport past answers…
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json,text/csv,.csv"
              className="hidden"
              onChange={(e) => {
                open(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <button type="button" onClick={newCustomer} className="font-semibold text-accent-text hover:underline">
              Start a new customer
            </button>
            <button type="button" onClick={backToDemo} className="font-semibold text-muted hover:underline">
              Back to the {client.shortName} demo
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
