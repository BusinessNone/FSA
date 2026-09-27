import { useEffect, useState } from "react";
import { cellById, client, contrastBlueprint, grid, intake, meridianAnswers, type GridCell } from "../content";
import { cellId } from "../../shared/api";
import type { CellRef } from "../lib/record";
import type { PlacementState } from "../lib/usePlacement";
import { GridView } from "../components/GridView";
import { ModelGuide, modelsByMaturity } from "../components/ModelGuide";
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
  claimed: CellRef;
  setClaimed: (c: CellRef) => void;
  customerName: string;
  onRestore: () => void;
  placement: PlacementState;
  onOpenBlueprint: () => void;
  onOpenRecord: () => void;
}

export function Placement({ answers, setAnswers, claimed, setClaimed, customerName, onRestore, placement, onOpenBlueprint, onOpenRecord }: Props) {
  const placed = placement.result ? cellById(placement.result.cell) : undefined;
  const claimedCell = cellById(cellId(claimed.row, claimed.column));
  const { active: cue } = useCues();
  const [inspectId, setInspectId] = useState<string | undefined>();
  const edited =
    intake.questions.some((q) => answers[q.id] !== meridianAnswers[q.id]) ||
    claimed.row !== intake.claim.meridian.row ||
    claimed.column !== intake.claim.meridian.column;

  // A new placement clears any cell the user was inspecting.
  useEffect(() => setInspectId(undefined), [placed?.id]);

  const inspected = inspectId && inspectId !== placed?.id ? cellById(inspectId) : undefined;
  const restore = onRestore;

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
            const active =
              intake.questions.every((q) => answers[q.id] === p.answers[q.id]) && claimed.row === p.claimed.row && claimed.column === p.claimed.column;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setAnswers({ ...p.answers });
                  setClaimed({ ...p.claimed });
                }}
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
        <IntakeStepper answers={answers} setAnswers={setAnswers} claimed={claimed} setClaimed={setClaimed} customerName={customerName} onOpenRecord={onOpenRecord} />
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
            claimedId={claimedCell?.id}
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
          <PlacementResult
            cell={placed}
            claimedCell={claimedCell}
            customerName={customerName}
            rationale={placement.result.rationale}
            onOpenBlueprint={onOpenBlueprint}
            onRestore={restore}
          />
        )}

        {inspected && <InspectCell cell={inspected} onClose={() => setInspectId(undefined)} />}
      </section>
    </div>
  );
}

function PlacementResult({
  cell,
  claimedCell,
  customerName,
  rationale,
  onOpenBlueprint,
  onRestore,
}: {
  cell: GridCell;
  claimedCell?: GridCell;
  customerName: string;
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
      {claimedCell && <SaysDoes claimed={claimedCell} actual={cell} name={customerName} />}
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

// One question at a time, laid out like a Microsoft Adaptive Card: an emphasis header,
// a text block, an expanded choice set, a separator, an action set, and a fact set.
// Step 0 captures where the client says they are; the rest capture how they behave.
function IntakeStepper({
  answers,
  setAnswers,
  claimed,
  setClaimed,
  customerName,
  onOpenRecord,
}: {
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  claimed: CellRef;
  setClaimed: (c: CellRef) => void;
  customerName: string;
  onOpenRecord: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [showFacts, setShowFacts] = useState(false);
  const [guideRow, setGuideRow] = useState<string>();
  const total = intake.questions.length + 1;
  const last = index === total - 1;
  const q = index > 0 ? intake.questions[index - 1] : undefined;
  const claim = intake.claim;
  const claimedTitle = cellById(cellId(claimed.row, claimed.column))?.title;
  const acButton = "inline-flex items-center justify-center gap-1.5 rounded px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  const choice = (name: string, value: string, checked: boolean, label: string, onChange: () => void, hint?: string) => (
    <label key={value} className="flex cursor-pointer items-start gap-2.5 rounded px-1.5 py-1.5 text-sm hover:bg-surface-2">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-text)]" />
      <span className={cx("flex-1 leading-snug text-ink", checked && "font-semibold")}>{label}</span>
      {hint && <span className="shrink-0 text-[0.7rem] text-muted">{hint}</span>}
    </label>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-3 bg-surface-2 px-4 py-3">
        <img src="/favicon.svg" alt="" className="h-9 w-9 rounded" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink">Placement intake</div>
          <div className="truncate text-xs text-muted">
            {customerName} · {index === 0 ? "Claim" : `Question ${index} of ${total - 1}`}
          </div>
        </div>
        <button type="button" onClick={onOpenRecord} className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-accent-text hover:bg-surface">
          Reimport past answers
        </button>
      </div>
      <div className="flex h-1 bg-line" aria-hidden>
        <div className="bg-accent transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      {!q ? (
        <fieldset key="claim" className="animate-rise px-4 pb-4 pt-4">
          <legend className="sr-only">{claim.prompt}</legend>
          <div className="text-xs font-semibold uppercase tracking-wide text-accent-text">{claim.short}</div>
          <p className="mt-1 text-lg font-bold leading-snug text-ink">{claim.prompt}</p>
          <p className="mt-1 text-sm text-muted">{claim.help}</p>
          <div role="radiogroup" aria-label={claim.rowPrompt} className="mt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-1.5">
              <span className="text-xs font-semibold text-muted">{claim.rowPrompt}</span>
              <button type="button" onClick={() => setGuideRow(claimed.row)} className="text-xs font-semibold text-accent-text hover:underline">
                Conversation guide: {grid.rows.find((r) => r.id === claimed.row)?.profile.model}
              </button>
            </div>
            <p className="mt-0.5 px-1.5 text-xs text-muted">{claim.rowHelp}</p>
            <div className="mt-2 space-y-2">
              {modelsByMaturity.map((r) => {
                const checked = claimed.row === r.id;
                return (
                  <label
                    key={r.id}
                    className={cx(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition",
                      checked ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2",
                    )}
                  >
                    <input type="radio" name="claim-row" value={r.id} checked={checked} onChange={() => setClaimed({ ...claimed, row: r.id })} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent-text)]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className={cx("text-sm text-ink", checked ? "font-bold" : "font-semibold")}>
                          {r.profile.model} <span className="font-normal text-muted">({r.label})</span>
                        </span>
                        {r.id === claim.meridian.row && !checked && <span className="text-[0.7rem] text-muted">{client.shortName}</span>}
                      </span>
                      <span className="mt-1 grid gap-1 text-xs leading-snug text-ink sm:grid-cols-3 sm:gap-3">
                        {claim.selfRating.map((q) => (
                          <span key={q.id} title={q.prompt}>
                            <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{q.short}</span>“{r.profile.says[q.id]}”
                          </span>
                        ))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div role="radiogroup" aria-label={claim.columnPrompt} className="mt-4">
            <div className="mb-1 px-1.5 text-xs font-semibold text-muted">{claim.columnPrompt}</div>
            <div className="grid sm:grid-cols-2">
              {grid.columns.map((c) =>
                choice("claim-col", c.id, claimed.column === c.id, c.label, () => setClaimed({ ...claimed, column: c.id }), c.id === claim.meridian.column && claimed.column !== c.id ? `${client.shortName}` : undefined),
              )}
            </div>
          </div>
          {guideRow && <ModelGuide rowId={guideRow} onClose={() => setGuideRow(undefined)} onSwitch={setGuideRow} />}
        </fieldset>
      ) : (
        <fieldset key={q.id} className="animate-rise px-4 pb-4 pt-4">
          <legend className="sr-only">
            Question {index} of {total - 1}
          </legend>
          <div className="text-xs font-semibold uppercase tracking-wide text-accent-text">{q.short}</div>
          <p className="mt-1 text-lg font-bold leading-snug text-ink">{q.prompt}</p>
          <div className="mt-3 space-y-1" role="radiogroup" aria-label={q.prompt}>
            {q.options.map((o) =>
              choice(
                `q-${q.id}`,
                o.id,
                answers[q.id] === o.id,
                o.label,
                () => setAnswers({ ...answers, [q.id]: o.id }),
                o.id === q.meridianAnswer && answers[q.id] !== o.id ? `${client.shortName}'s answer` : undefined,
              ),
            )}
          </div>
        </fieldset>
      )}

      <div className="border-t border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} className={cx(acButton, "border border-line bg-surface text-ink hover:bg-surface-2")}>
            Back
          </button>
          <button type="button" onClick={() => setIndex(index + 1)} disabled={last} className={cx(acButton, "bg-accent-text text-white hover:opacity-90 dark:bg-accent dark:text-accent-ink")}>
            Next
          </button>
          <button type="button" onClick={() => setShowFacts((v) => !v)} aria-expanded={showFacts} className={cx(acButton, "ml-auto px-2 text-accent-text hover:bg-surface-2")}>
            {showFacts ? "Hide answers" : "All answers"}
          </button>
        </div>
      </div>

      {showFacts && (
        <dl className="animate-rise grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1.5 border-t border-line bg-surface-2/60 px-4 py-3 text-sm">
          <dt className="font-semibold text-ink">
            <button type="button" onClick={() => setIndex(0)} className="text-left hover:underline">
              {claim.short}
            </button>
          </dt>
          <dd className="text-muted">{claimedTitle}</dd>
          {intake.questions.map((item, i) => {
            const answer = item.options.find((o) => o.id === answers[item.id]);
            const changed = answers[item.id] !== item.meridianAnswer;
            return (
              <div key={item.id} className="contents">
                <dt className="font-semibold text-ink">
                  <button type="button" onClick={() => setIndex(i + 1)} className="text-left hover:underline">
                    {item.short}
                  </button>
                </dt>
                <dd className={cx("text-muted", changed && "font-medium text-accent-text")}>{answer?.label}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

function SaysDoes({ claimed, actual, name }: { claimed: GridCell; actual: GridCell; name: string }) {
  const gap = claimed.id !== actual.id;
  const fill = (t: string) => t.replace("{name}", name).replace("{claimed}", claimed.title).replace("{actual}", actual.title);
  return (
    <div className={cx("mt-3 rounded-lg border px-3 py-2.5 text-sm", gap ? "border-warn/50 bg-warn-soft" : "border-positive/40 bg-positive-soft")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-ink border-dashed" aria-hidden /> Says: {claimed.title}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-ink" aria-hidden /> Does: {actual.title}
        </span>
      </div>
      <p className="mt-1.5 text-ink">{fill(gap ? intake.claim.gapText : intake.claim.matchText)}</p>
    </div>
  );
}
