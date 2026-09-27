import { useEffect, useState } from "react";
import { cellById, client, contrastBlueprint, grid, intake, meridianAnswers, type GridCell } from "../content";
import type { PlacementState } from "../lib/usePlacement";
import { GridView } from "../components/GridView";
import { Button, Card, cx, Icon, SectionLabel, Tag } from "../components/ui";
import { cueRing, useCues, type ActiveCue } from "../lib/cues";

const presetCue: Record<string, ActiveCue> = {
  "visit-operator": "try-contrast",
  "uptime-operator": "try-coming",
  meridian: "return-meridian",
};

interface Props {
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  placement: PlacementState;
  onOpenBlueprint: () => void;
}

export function Placement({ answers, setAnswers, placement, onOpenBlueprint }: Props) {
  const placed = placement.result ? cellById(placement.result.cell) : undefined;
  const { active: cue } = useCues();
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
                  cueRing(cue, presetCue[p.id] ?? null),
                  active ? "border-accent bg-accent-soft text-accent-text" : "border-line text-muted hover:text-ink",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <IntakeStepper answers={answers} setAnswers={setAnswers} />
      </section>

      <section aria-labelledby="grid-title" className="min-w-0 space-y-4">
        <div>
          <h2 id="grid-title" className="text-lg font-semibold">
            {grid.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{grid.thesis}</p>
        </div>
        <Card className="p-4">
          <GridView
            placedId={placed?.id}
            selectedId={inspectId}
            pending={placement.status === "loading"}
            onSelect={(c) => (c.id === placed?.id && c.depth === "deep" ? onOpenBlueprint() : setInspectId(c.id))}
          />
          <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
            <span className="font-semibold text-ink">How to read this. </span>
            {grid.howToRead}
          </p>
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
  const { active } = useCues();
  return (
    <Card className="animate-rise p-5" key={cell.id}>
      <div className="flex flex-wrap items-center gap-2">
        <SectionLabel>Placement</SectionLabel>
        {cell.depth === "deep" && <Tag tone="accent">Blueprint built</Tag>}
        {cell.depth === "contrast" && <Tag>Contrast blueprint</Tag>}
        {cell.depth === "coming" && <Tag>{grid.comingLabel}</Tag>}
      </div>
      <h3 className="mt-2 text-xl font-semibold">{cell.title}</h3>
      <CoherenceLine cell={cell} />
      <p className="mt-3 max-w-prose leading-relaxed">{rationale}</p>

      {cell.depth === "deep" && (
        <div className="mt-4">
          <Button variant="primary" className={cueRing(active, "next")} onClick={onOpenBlueprint}>
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
          <Button className={cueRing(active, "return-meridian")} onClick={onRestore}>
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
          <Button className={cueRing(active, "return-meridian")} onClick={onRestore}>
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
          <CoherenceLine cell={cell} />
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

function CoherenceLine({ cell }: { cell: GridCell }) {
  const c = grid.coherence.find((x) => x.id === cell.coherence)!;
  return (
    <p className="mt-1 text-sm">
      <span className={cx("font-semibold", cell.coherence === "aligned" ? "text-accent-text" : cell.coherence === "trap" ? "text-positive" : "text-muted")}>
        {c.label}:
      </span>{" "}
      <span className="text-muted">
        {cell.signal}. {c.description}
      </span>
    </p>
  );
}

// One question at a time, in the style of a step-through form card.
function IntakeStepper({ answers, setAnswers }: { answers: Record<string, string>; setAnswers: (a: Record<string, string>) => void }) {
  const [index, setIndex] = useState(0);
  const q = intake.questions[index];
  const total = intake.questions.length;
  const last = index === total - 1;

  return (
    <div className="space-y-4">
      <div className="stepper-bg rounded-3xl p-4 sm:p-5">
        <ol className="mb-4 flex gap-1.5" aria-label="Question progress">
          {intake.questions.map((item, i) => (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Question ${i + 1}`}
                aria-current={i === index ? "step" : undefined}
                className={cx("block h-1.5 w-full rounded-full transition", i === index ? "bg-[#009cde]" : i < index ? "bg-white" : "bg-white/25 hover:bg-white/50")}
              />
            </li>
          ))}
        </ol>

        <fieldset key={q.id} className="card-shadow animate-rise rounded-2xl bg-surface p-5 sm:p-6">
          <div className="text-3xl font-bold text-line" aria-hidden>
            Q{index + 1}
          </div>
          <legend className="sr-only">
            Question {index + 1} of {total}
          </legend>
          <p className="mt-2 text-xl font-semibold leading-snug text-ink">{q.prompt}</p>
          <div className="mt-4 space-y-2" role="radiogroup" aria-label={q.prompt}>
            {q.options.map((o) => {
              const checked = answers[q.id] === o.id;
              const isMeridian = o.id === q.meridianAnswer;
              return (
                <label
                  key={o.id}
                  className={cx(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition",
                    checked ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line hover:border-muted",
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={o.id}
                    checked={checked}
                    onChange={() => setAnswers({ ...answers, [q.id]: o.id })}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className={cx("flex-1 leading-snug", checked ? "font-medium text-ink" : "text-ink/85")}>{o.label}</span>
                  {isMeridian && !checked && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] font-semibold text-muted">{client.shortName}</span>}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white disabled:opacity-0"
          >
            Back
          </button>
          <span className="text-xs text-white/70 tabular-nums">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            disabled={last}
            className="min-w-32 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#00153d] shadow-md transition hover:bg-white/90 disabled:bg-white/30 disabled:text-white/70 disabled:shadow-none"
          >
            {last ? "All answered" : "Next"}
          </button>
        </div>
      </div>

      <details className="group rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer select-none font-semibold text-ink">All answers</summary>
        <ol className="mt-2 space-y-1.5">
          {intake.questions.map((item, i) => {
            const answer = item.options.find((o) => o.id === answers[item.id]);
            const changed = answers[item.id] !== item.meridianAnswer;
            return (
              <li key={item.id}>
                <button type="button" onClick={() => setIndex(i)} className="w-full rounded-lg px-2 py-1 text-left hover:bg-surface-2">
                  <span className="text-muted tabular-nums">Q{i + 1}. </span>
                  <span className={cx(changed && "font-medium text-accent-text")}>{answer?.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
