import { cells, grid, type GridCell } from "../content";
import type { Coherence } from "../../shared/schema";
import { useState } from "react";
import { cx, Icon } from "./ui";
import { ModelGuide, Sources } from "./ModelGuide";

const depthLabel: Record<GridCell["depth"], string> = {
  deep: "Blueprint built",
  contrast: "Contrast blueprint",
  coming: grid.comingLabel,
};

// Cell fills follow the RSM TOM matrix: blue aligned, light gray transitional,
// dark gray incoherent, and the trap outlined in green.
const coherenceStyle: Record<Coherence, string> = {
  aligned: "bg-coh-aligned text-coh-ink border-transparent",
  transitional: "bg-coh-transitional text-coh-ink border-transparent dark:text-ink",
  incoherent: "bg-coh-incoherent text-coh-ink-inverse border-transparent",
  trap: "bg-surface text-ink border-positive border-2",
};

const coherenceLabel = Object.fromEntries(grid.coherence.map((c) => [c.id, c.label])) as Record<Coherence, string>;

interface Props {
  placedId?: string;
  claimedId?: string;
  selectedId?: string;
  onSelect?: (cell: GridCell) => void;
  pending?: boolean;
}

// The TOM grid: business model (rows, top to bottom) by service scenario (columns).
export function GridView({ placedId, claimedId, selectedId, onSelect, pending }: Props) {
  const [guideRow, setGuideRow] = useState<string>();
  return (
    <div className="w-full">
      {/* On narrow screens the grid scrolls inside its card instead of widening the page. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1 pt-1">
      <div className="grid min-w-[38rem] gap-2" style={{ gridTemplateColumns: "minmax(6.5rem, 0.7fr) repeat(4, minmax(0, 1fr))" }}>
        <div className="flex items-end pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{grid.rowAxisLabel} ↑</div>
        {grid.columns.map((c) => (
          <div key={c.id} className="rounded-lg bg-grid-head px-2 py-1.5 text-center text-sm font-semibold leading-tight text-grid-head-ink" title={c.description}>
            {c.label}
          </div>
        ))}
        {grid.rows.map((r) => (
          <Row key={r.id} rowId={r.id} label={r.label} description={r.description} onOpenGuide={() => setGuideRow(r.id)} placedId={placedId} claimedId={claimedId} selectedId={selectedId} onSelect={onSelect} pending={pending} />
        ))}
        <div />
        <div className="col-span-4 pt-1 text-center text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{grid.columnAxisLabel} →</div>
      </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        {grid.coherence.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1.5" title={c.description}>
            <span className={cx("h-3 w-3 rounded-sm", coherenceStyle[c.id], c.id === "trap" && "border-2")} aria-hidden />
            {c.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-dashed border-muted" aria-hidden />
          {grid.comingLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-full border-2 border-dashed border-ink px-1.5 text-[0.65rem] font-semibold text-ink">Says</span>
          where the client claims to be
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-full bg-ink px-1.5 text-[0.65rem] font-semibold text-surface">Does</span>
          where its answers place it
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Sources set={grid.sources.rows} label={`Sources: ${grid.rowAxisLabel.toLowerCase()} (rows)`} />
        <Sources set={grid.sources.columns} label="Sources: service scenarios (columns)" />
      </div>
      {guideRow && <ModelGuide rowId={guideRow} onClose={() => setGuideRow(undefined)} onSwitch={setGuideRow} />}
    </div>
  );
}

function Row({ rowId, label, description, onOpenGuide, placedId, claimedId, selectedId, onSelect, pending }: Props & { rowId: string; label: string; description: string; onOpenGuide: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onOpenGuide}
        title={`${description} Open the conversation guide.`}
        className="group flex flex-col items-start justify-center rounded-lg bg-grid-head px-2 text-left text-sm font-semibold leading-tight text-grid-head-ink hover:opacity-90"
      >
        {label}
        <span className="mt-1 text-[0.65rem] font-medium opacity-75 group-hover:underline">Conversation guide</span>
      </button>
      {cells
        .filter((c) => c.row === rowId)
        .map((c) => {
          const placed = c.id === placedId;
          const claimed = c.id === claimedId;
          const selected = c.id === selectedId;
          const coming = c.depth === "coming";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect?.(c)}
              aria-pressed={selected}
              aria-label={`${c.title}. ${coherenceLabel[c.coherence]}: ${c.signal}. ${depthLabel[c.depth]}.${claimed ? " The client says it is here." : ""}${placed ? " Its answers place it here." : ""}`}
              className={cx(
                "relative flex min-h-[6rem] min-w-0 flex-col justify-between rounded-lg border p-2.5 text-left transition",
                coherenceStyle[c.coherence],
                coming && !placed && !claimed && "opacity-55 hover:opacity-90",
                placed && "z-10 opacity-100 ring-4 ring-ink ring-offset-2 ring-offset-surface",
                selected && !placed && "ring-2 ring-muted ring-offset-1 ring-offset-surface",
                placed && pending && "opacity-60",
              )}
            >
              <span className="text-[0.7rem] font-bold uppercase tracking-wide opacity-80">{coherenceLabel[c.coherence]}</span>
              <span className="mt-1 text-xs font-medium leading-snug">{c.signal}</span>
              <span className="mt-2 flex flex-wrap items-center justify-between gap-1">
                {placed || claimed ? (
                  <span className="flex flex-wrap gap-1">
                    {claimed && (
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-current bg-surface/80 px-2 py-0.5 text-[0.7rem] font-semibold text-ink animate-rise">
                        Says
                      </span>
                    )}
                    {placed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[0.7rem] font-semibold text-surface animate-rise">
                        <Icon name="pin" className="h-3 w-3" />
                        Does
                      </span>
                    )}
                  </span>
                ) : (
                  <span className={cx("text-[0.65rem] font-semibold opacity-75", coming && "italic")}>{c.depth === "coming" ? "In development" : depthLabel[c.depth]}</span>
                )}
                {c.depth === "deep" && !placed && <Icon name="check" className="h-3.5 w-3.5 opacity-75" />}
              </span>
            </button>
          );
        })}
    </>
  );
}
