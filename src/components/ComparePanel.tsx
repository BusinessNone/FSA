import { useEffect, useMemo, useRef, useState } from "react";
import type { Maturity } from "../../shared/schema";
import { cells, compare, grid } from "../content";
import { combinedCsv, industryOf, maturityRank, mergeEntries, parseRecordFile, sampleEntries, type CompareEntry } from "../lib/compare";
import { downloadText } from "../lib/markdown";
import { cx, Icon, SectionLabel } from "./ui";

const maturityStyle: Record<Maturity, string> = {
  coherent: "bg-coh-aligned text-coh-ink",
  misread: "bg-accent-soft text-accent-text ring-1 ring-accent",
  transitional: "bg-coh-transitional text-coh-ink dark:text-ink",
  trap: "bg-surface text-ink ring-2 ring-positive",
  incoherent: "bg-coh-incoherent text-coh-ink-inverse",
};

const maturityLabel = Object.fromEntries(compare.maturity.map((m) => [m.id, m.label])) as Record<Maturity, string>;

function MaturityBadge({ m }: { m?: Maturity }) {
  if (!m) return <span className="text-xs text-muted">No placement</span>;
  return <span className={cx("inline-flex rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap", maturityStyle[m])}>{maturityLabel[m]}</span>;
}

interface Props {
  entries: CompareEntry[];
  setEntries: (e: CompareEntry[]) => void;
  openRecordEntry: () => CompareEntry | null;
  onClose: () => void;
}

export function ComparePanel({ entries, setEntries, openRecordEntry, onClose }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();
  const [industry, setIndustry] = useState<string>();
  const [maturity, setMaturity] = useState<Maturity>();
  const [showSays, setShowSays] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let added: CompareEntry[] = [];
    const problems: string[] = [];
    for (const f of Array.from(files)) {
      try {
        added = added.concat(parseRecordFile(await f.text(), f.name));
      } catch (err) {
        problems.push((err as Error).message);
      }
    }
    setEntries(mergeEntries(entries, added));
    setMessage([added.length ? `Loaded ${added.length} customer${added.length === 1 ? "" : "s"}.` : "", ...problems].filter(Boolean).join(" "));
  };

  const industries = useMemo(() => {
    const present = new Set(entries.map(industryOf));
    const ordered = compare.industries.map((i) => i.name).filter((n) => present.has(n));
    return [...ordered, ...[...present].filter((n) => !ordered.includes(n)).sort()];
  }, [entries]);

  const shown = entries
    .filter((e) => !industry || industryOf(e) === industry)
    .filter((e) => !maturity || e.maturity === maturity)
    .sort((a, b) => maturityRank(a.maturity) - maturityRank(b.maturity) || a.name.localeCompare(b.name));

  const chip = (active: boolean) =>
    cx("rounded-full border px-3 py-1 text-xs font-medium transition", active ? "border-accent bg-accent-soft text-accent-text" : "border-line text-muted hover:text-ink");
  const toolButton = "inline-flex items-center gap-1.5 rounded border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="compare-title">
      <button type="button" aria-label="Close compare" className="absolute inset-0 bg-[#00153d]/50" onClick={onClose} />
      <div className="animate-rise relative m-0 flex h-full w-full flex-col overflow-hidden bg-bg shadow-2xl sm:m-4 sm:h-auto sm:rounded-xl">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
          <div>
            <h2 id="compare-title" className="text-xl font-bold text-ink">
              {compare.title}
            </h2>
            <p className="mt-0.5 max-w-3xl text-sm text-muted">{compare.intro}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 py-1 text-lg text-muted hover:bg-surface-2">
            ×
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-5 py-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 rounded bg-accent-text px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 dark:bg-accent dark:text-accent-ink"
          >
            Add record files…
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="application/json,.json,text/csv,.csv"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={toolButton}
            onClick={() => {
              const e = openRecordEntry();
              if (e) {
                setEntries(mergeEntries(entries, [e]));
                setMessage(`Added ${e.name} from the open record.`);
              } else setMessage("Open a customer record first; the fictional demo client is not added.");
            }}
          >
            Add the open record
          </button>
          <button type="button" className={toolButton} onClick={() => setEntries(mergeEntries(entries, sampleEntries()))}>
            {entries.some((e) => e.sample) ? "Reload sample customers" : "Load sample customers"}
          </button>
          <button type="button" className={toolButton} disabled={!entries.length} onClick={() => downloadText(`customer-records-${new Date().toISOString().slice(0, 10)}.csv`, combinedCsv(entries), "text/csv;charset=utf-8")}>
            <Icon name="download" /> Export combined CSV
          </button>
          <button
            type="button"
            className="rounded px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink disabled:opacity-40"
            disabled={!entries.some((e) => e.sample)}
            onClick={() => setEntries(entries.filter((e) => !e.sample))}
          >
            Remove samples
          </button>
          <button type="button" className="rounded px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink disabled:opacity-40" disabled={!entries.length} onClick={() => setEntries([])}>
            Clear all
          </button>
          {message && (
            <span className="text-sm text-ink" role="status">
              {message}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {!entries.length ? (
            <div className="mx-auto max-w-xl rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
              <p className="font-semibold text-ink">No customers loaded yet.</p>
              <p className="mt-1 text-sm text-muted">Add exported record files (JSON or CSV, one or many customers each), add the open record, or load the fictional sample set to see how the comparison reads.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by industry">
                  <span className="w-20 text-xs font-semibold text-muted">Industry</span>
                  <button type="button" className={chip(!industry)} onClick={() => setIndustry(undefined)} aria-pressed={!industry}>
                    All
                  </button>
                  {industries.map((i) => (
                    <button key={i} type="button" className={chip(industry === i)} onClick={() => setIndustry(industry === i ? undefined : i)} aria-pressed={industry === i}>
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by maturity">
                  <span className="w-20 text-xs font-semibold text-muted">Maturity</span>
                  <button type="button" className={chip(!maturity)} onClick={() => setMaturity(undefined)} aria-pressed={!maturity}>
                    All
                  </button>
                  {compare.maturity.map((m) => (
                    <button key={m.id} type="button" className={chip(maturity === m.id)} onClick={() => setMaturity(maturity === m.id ? undefined : m.id)} aria-pressed={maturity === m.id} title={m.description}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <section className="rounded-xl border border-line bg-surface p-4">
                <SectionLabel>Industry by TOM maturity</SectionLabel>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[44rem] border-separate border-spacing-1 text-sm">
                    <thead>
                      <tr>
                        <th className="w-56 text-left text-xs font-semibold text-muted">Industry</th>
                        {compare.maturity.map((m) => (
                          <th key={m.id} className="text-left" title={m.description}>
                            <MaturityBadge m={m.id} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {industries
                        .filter((i) => !industry || i === industry)
                        .map((i) => (
                          <tr key={i}>
                            <th className="rounded bg-grid-head px-2 py-1.5 text-left text-xs font-semibold text-grid-head-ink">{i}</th>
                            {compare.maturity.map((m) => {
                              const here = shown.filter((e) => industryOf(e) === i && e.maturity === m.id);
                              return (
                                <td key={m.id} className={cx("rounded px-2 py-1.5 align-top", here.length ? "bg-surface-2" : "bg-surface-2/40")}>
                                  {here.map((e) => (
                                    <div key={e.key} className="text-xs leading-snug text-ink">
                                      {e.name}
                                      {e.sector && <span className="text-muted"> · {e.sector}</span>}
                                    </div>
                                  ))}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionLabel>Where their answers place them</SectionLabel>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={showSays} onChange={(e) => setShowSays(e.target.checked)} className="accent-[var(--accent)]" />
                    Also show where they say they are
                  </label>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <div className="grid min-w-[44rem] gap-1.5" style={{ gridTemplateColumns: "8rem repeat(4, minmax(0, 1fr))" }}>
                    <div />
                    {grid.columns.map((c) => (
                      <div key={c.id} className="rounded bg-grid-head px-2 py-1 text-center text-xs font-semibold text-grid-head-ink">
                        {c.label}
                      </div>
                    ))}
                    {grid.rows.map((r) => (
                      <div key={r.id} className="contents">
                        <div className="flex items-center rounded bg-grid-head px-2 text-xs font-semibold text-grid-head-ink">{r.label}</div>
                        {cells
                          .filter((c) => c.row === r.id)
                          .map((c) => {
                            const does = shown.filter((e) => e.actual?.id === c.id);
                            const says = showSays ? shown.filter((e) => e.claimed?.id === c.id && e.actual?.id !== c.id) : [];
                            return (
                              <div key={c.id} className="min-h-[4.5rem] rounded border border-line bg-surface-2/50 p-1.5">
                                <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{grid.coherence.find((x) => x.id === c.coherence)?.label}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {does.map((e) => (
                                    <span key={e.key} className="rounded-full bg-ink px-2 py-0.5 text-[0.7rem] font-semibold text-surface" title={`${e.name}: does`}>
                                      {e.name}
                                    </span>
                                  ))}
                                  {says.map((e) => (
                                    <span key={`s-${e.key}`} className="rounded-full border border-dashed border-ink px-2 py-0.5 text-[0.7rem] font-medium text-ink" title={`${e.name}: says`}>
                                      {e.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">Solid: where the answers place the customer. Dashed: where the customer says it is, when different.</p>
              </section>

              <section className="rounded-xl border border-line bg-surface p-4">
                <SectionLabel>Customers</SectionLabel>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-left text-sm">
                    <thead className="border-b border-line text-xs text-muted">
                      <tr>
                        {["Customer", "Industry", "Sector", "Revenue", "Technicians", "Says", "Does", "Maturity"].map((h) => (
                          <th key={h} className="px-2 py-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((e) => (
                        <tr key={e.key} className="border-b border-line/60 align-top">
                          <td className="px-2 py-2 font-semibold text-ink">
                            {e.name}
                            <div className="text-[0.7rem] font-normal text-muted">{e.source}</div>
                          </td>
                          <td className="px-2 py-2">{industryOf(e)}</td>
                          <td className="px-2 py-2">{e.sector}</td>
                          <td className="px-2 py-2">{e.revenue}</td>
                          <td className="px-2 py-2">{e.technicians}</td>
                          <td className="px-2 py-2">{e.claimed?.title ?? ""}</td>
                          <td className="px-2 py-2">{e.actual?.title ?? ""}</td>
                          <td className="px-2 py-2">
                            <MaturityBadge m={e.maturity} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Maturity is read from the TOM: the rating of the cell the answers land in, and whether the customer describes itself accurately.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
