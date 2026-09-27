import { useEffect, useState } from "react";
import { cellById, client, contrastBlueprint, grid, intake, meridianAnswers, type GridCell } from "../content";
import type { PlacementState } from "../lib/usePlacement";
import { GridView } from "../components/GridView";
import { Button, Card, cx, Icon, SectionLabel, Tag } from "../components/ui";

interface Props {
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  placement: PlacementState;
  onOpenBlueprint: () => void;
}

export function Placement({ answers, setAnswers, placement, onOpenBlueprint }: Props) {
  const placed = placement.result ? cellById(placement.result.cell) : undefined;
  const [inspectId, setInspectId] = useState<string | undefined>();
  const edited = intake.questions.some((q) => answers[q.id] !== meridianAnswers[q.id]);

  // A new placement clears any cell the user was inspecting.
  useEffect(() => setInspectId(undefined), [placed?.id]);

  const inspected = inspectId && inspectId !== placed?.id ? cellById(inspectId) : undefined;
  const restore = () => setAnswers({ ...meridianAnswers });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
      <section aria-labelledby="intake-title" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="intake-title" className="text-lg font-semibold">
            Intake
          </h2>
          {edited && (
            <Button variant="ghost" onClick={restore} className="-my-1 text-xs">
              <Icon name="reset" /> Restore {client.shortName}'s answers
            </Button>
          )}
        </div>
        <p className="mb-4 text-sm text-muted">{intake.intro}</p>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Answer presets">
          {intake.presets.map((p) => {
            const active = intake.questions.every((q) => answers[q.id] === p.answers[q.id]);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setAnswers({ ...p.answers })}
                aria-pressed={active}
                className={cx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <ol className="space-y-2">
          {intake.questions.map((q, i) => {
            const changed = answers[q.id] !== meridianAnswers[q.id];
            return (
              <li key={q.id}>
                <Card className={cx("px-3 py-2.5", changed && "border-accent/60")}>
                  <label htmlFor={`q-${q.id}`} className="mb-1 flex gap-2 text-sm font-medium leading-snug">
                    <span className="text-muted tabular-nums">{i + 1}.</span>
                    <span>{q.prompt}</span>
                  </label>
                  <select
                    id={`q-${q.id}`}
                    value={answers[q.id]}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full cursor-pointer rounded-md border border-line bg-surface-2 px-2.5 py-1 text-sm text-ink"
                  >
                    {q.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="grid-title" className="min-w-0 space-y-4">
        <h2 id="grid-title" className="text-lg font-semibold">
          {grid.title}
        </h2>
        <Card className="p-4">
          <GridView
            placedId={placed?.id}
            selectedId={inspectId}
            pending={placement.status === "loading"}
            onSelect={(c) => (c.id === placed?.id && c.depth === "deep" ? onOpenBlueprint() : setInspectId(c.id))}
          />
        </Card>

        {placement.status === "error" && (
          <Card className="border-danger/50 p-4 text-sm">
            The placement service did not respond. Run the app with <code>npm run dev</code> so the Worker serves <code>/api/place</code>.
          </Card>
        )}

        {placed && placement.result && (
          <PlacementResult cell={placed} rationale={placement.result.rationale} onOpenBlueprint={onOpenBlueprint} onRestore={restore} />
        )}

        {inspected && <InspectCell cell={inspected} onClose={() => setInspectId(undefined)} />}
      </section>
    </div>
  );
}

function PlacementResult({
  cell,
  rationale,
  onOpenBlueprint,
  onRestore,
}: {
  cell: GridCell;
  rationale: string;
  onOpenBlueprint: () => void;
  onRestore: () => void;
}) {
  return (
    <Card className="animate-rise p-5" key={cell.id}>
      <div className="flex flex-wrap items-center gap-2">
        <SectionLabel>Placement</SectionLabel>
        {cell.depth === "deep" && <Tag tone="accent">Blueprint built</Tag>}
        {cell.depth === "contrast" && <Tag>Contrast blueprint</Tag>}
        {cell.depth === "coming" && <Tag>{grid.comingLabel}</Tag>}
      </div>
      <h3 className="mt-2 text-xl font-semibold">{cell.title}</h3>
      <p className="mt-2 max-w-prose leading-relaxed">{rationale}</p>

      {cell.depth === "deep" && (
        <div className="mt-4">
          <Button variant="primary" onClick={onOpenBlueprint}>
            Open the blueprint <Icon name="arrowRight" />
          </Button>
        </div>
      )}

      {cell.depth === "contrast" && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <p className="text-sm font-medium">{contrastBlueprint.contrastLine}</p>
          <p className="text-sm text-muted">{contrastBlueprint.summary}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <SectionLabel>Focus jobs</SectionLabel>
              <ul className="mt-2 space-y-1.5 text-sm">
                {contrastBlueprint.focusJobs.map((j) => (
                  <li key={j} className="flex gap-2">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    {j}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionLabel>KPIs</SectionLabel>
              <ul className="mt-2 space-y-2 text-sm">
                {contrastBlueprint.kpis.map((k) => (
                  <li key={k.id}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Icon name={k.direction === "higher" ? "arrowUp" : "arrowDown"} className="h-3.5 w-3.5 text-muted" />
                      {k.name}
                    </div>
                    <div className="text-muted">{k.definition}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Button onClick={onRestore}>
            <Icon name="reset" /> Return to {client.shortName}'s answers
          </Button>
        </div>
      )}

      {cell.depth === "coming" && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <p className="text-sm text-muted">{cell.oneLiner}</p>
          <p className="text-sm">
            The blueprint for this cell is in development. The method is the same; the pre-built content is not ready yet.
          </p>
          <Button onClick={onRestore}>
            <Icon name="reset" /> Return to {client.shortName}'s cell
          </Button>
        </div>
      )}
    </Card>
  );
}

function InspectCell({ cell, onClose }: { cell: GridCell; onClose: () => void }) {
  return (
    <Card className="animate-rise p-4" key={cell.id}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{cell.depth === "coming" ? grid.comingLabel : cell.depth === "contrast" ? "Contrast blueprint" : "Blueprint built"}</SectionLabel>
          <div className="mt-1 font-semibold">{cell.title}</div>
          <p className="mt-1 text-sm text-muted">{cell.oneLiner}</p>
          {cell.depth === "contrast" && (
            <p className="mt-2 text-sm">
              KPIs here: {contrastBlueprint.kpis.map((k) => k.name).join(", ")}.
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close cell detail" className="-mr-2 -mt-1">
          ×
        </Button>
      </div>
    </Card>
  );
}
