import { cells, grid, client, type GridCell } from "../content";
import { cx, Icon } from "./ui";

const depthLabel: Record<GridCell["depth"], string> = {
  deep: "Blueprint built",
  contrast: "Contrast blueprint",
  coming: grid.comingLabel,
};

interface Props {
  placedId?: string;
  selectedId?: string;
  onSelect?: (cell: GridCell) => void;
  pending?: boolean;
}

// The TOM grid: service motivation (rows) × service scenario (columns).
export function GridView({ placedId, selectedId, onSelect, pending }: Props) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          {grid.rowAxisLabel} <span className="font-normal normal-case">by</span> {grid.columnAxisLabel}
        </div>
        <div className="text-xs text-muted">{grid.columnSource}</div>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "minmax(6.5rem, 0.7fr) repeat(4, minmax(0, 1fr))" }}>
        <div />
        {grid.columns.map((c) => (
          <div key={c.id} className="px-1 pb-1 text-sm font-semibold leading-tight" title={c.description}>
            {c.label}
          </div>
        ))}
        {grid.rows.map((r) => (
          <Row key={r.id} rowId={r.id} label={r.label} description={r.description} placedId={placedId} selectedId={selectedId} onSelect={onSelect} pending={pending} />
        ))}
      </div>
    </div>
  );
}

function Row({ rowId, label, description, placedId, selectedId, onSelect, pending }: Props & { rowId: string; label: string; description: string }) {
  return (
    <>
      <div className="flex items-center pr-2 text-sm font-semibold leading-tight" title={description}>
        {label}
      </div>
      {cells
        .filter((c) => c.row === rowId)
        .map((c) => {
          const placed = c.id === placedId;
          const selected = c.id === selectedId;
          const coming = c.depth === "coming";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect?.(c)}
              aria-pressed={selected}
              aria-label={`${c.title}. ${depthLabel[c.depth]}.${placed ? ` ${client.shortName} is placed here.` : ""}`}
              className={cx(
                "group relative flex min-h-[5.5rem] min-w-0 flex-col justify-between rounded-lg border p-2.5 text-left transition",
                placed
                  ? "border-accent bg-accent-soft ring-2 ring-accent"
                  : coming
                    ? "border-dashed border-line bg-surface-2/60 text-muted opacity-70 hover:opacity-100"
                    : "border-line bg-surface hover:border-muted",
                selected && !placed && "ring-2 ring-muted/50",
                placed && pending && "opacity-60",
              )}
            >
              <span className={cx("text-xs font-semibold leading-tight", placed ? "text-accent" : "text-muted")}>
                {depthLabel[c.depth]}
              </span>
              {placed ? (
                <span className="mt-2 inline-flex items-center gap-1 self-start rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink animate-rise">
                  <Icon name="pin" className="h-3.5 w-3.5" />
                  {client.shortName}
                </span>
              ) : (
                <span className="mt-2 line-clamp-2 text-xs leading-snug text-muted">{c.oneLiner}</span>
              )}
            </button>
          );
        })}
    </>
  );
}
