import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { grid, intake } from "../content";
import type { Grid } from "../../shared/schema";
import { SectionLabel } from "./ui";

type SourceSet = Grid["sources"]["rows"];

// The conversation guide for one business model: who to talk to, what they care about,
// what gets in their way, and questions that open the conversation.
export function ModelGuide({ rowId, onClose, onSwitch }: { rowId: string; onClose: () => void; onSwitch: (rowId: string) => void }) {
  const row = grid.rows.find((r) => r.id === rowId)!;
  const p = row.profile;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portal to <body> so an animated ancestor (transform) never traps the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="model-title">
      <button type="button" aria-label="Close conversation guide" className="fixed inset-0 bg-[#00153d]/50" onClick={onClose} />
      <div className="animate-rise relative w-full max-w-4xl overflow-hidden rounded-lg bg-surface shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line bg-surface-2 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-accent-text">{row.label}</div>
            <h2 id="model-title" className="text-xl font-bold text-ink">
              {p.model}
            </h2>
            <p className="mt-0.5 text-sm text-muted">{p.headline}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-full px-3 py-1 text-lg text-muted hover:bg-surface hover:text-ink">
            ×
          </button>
        </header>

        <div className="grid gap-5 px-5 py-5 md:grid-cols-[11rem_repeat(3,minmax(0,1fr))]">
          <section className="rounded-lg bg-grid-head p-3 text-grid-head-ink">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wider opacity-80">Likely audience</div>
            <div className="mt-1 text-lg font-bold leading-snug">{p.audience}</div>
            <div className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wider opacity-80">They say</div>
            <ul className="mt-1 space-y-2 text-xs leading-snug">
              {intake.claim.selfRating.map((q) => (
                <li key={q.id}>“{p.says[q.id]}”</li>
              ))}
            </ul>
          </section>
          <section>
            <SectionLabel>What they care about</SectionLabel>
            {p.caresAbout.map((c) => (
              <div key={c.lead} className="mt-2 text-sm">
                <div className="font-semibold text-ink">{c.lead}</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink">
                  {c.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          <section>
            <SectionLabel>Challenges they face</SectionLabel>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink">
              {p.challenges.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section>
            <SectionLabel>Start the conversation</SectionLabel>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink">
              {p.starters.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-5 py-3">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Business models">
            {modelsByMaturity.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSwitch(r.id)}
                aria-pressed={r.id === rowId}
                className={
                  r.id === rowId
                    ? "rounded px-3 py-1 text-xs font-semibold bg-accent-text text-white dark:bg-accent dark:text-accent-ink"
                    : "rounded px-3 py-1 text-xs font-semibold text-ink hover:bg-surface"
                }
              >
                {r.profile.model}
              </button>
            ))}
          </div>
          <Sources set={grid.sources.rows} label="Sources for the business models" />
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// Business models in maturity order, the way customers self-rate: cost center first.
export const modelsByMaturity = [...grid.rows].reverse();

// Where an axis comes from, as a disclosure with linked references.
export function Sources({ set, label }: { set: SourceSet; label: string }) {
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer font-semibold text-accent-text hover:underline">{label}</summary>
      <p className="mt-2 max-w-prose leading-relaxed">{set.summary}</p>
      <ul className="mt-2 space-y-1">
        {set.refs.map((r) => (
          <li key={r.title} className="leading-snug">
            <span className="font-semibold text-ink">{r.publisher}</span>, {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="text-accent-text underline-offset-2 hover:underline">
                {r.title}
              </a>
            ) : (
              r.title
            )}
            {r.year ? ` (${r.year})` : ""}
            {r.note ? `. ${r.note}` : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}
