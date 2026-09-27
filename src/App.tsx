import { useCallback, useEffect, useMemo, useState } from "react";
import { client, config, deepCell, meridianAnswers, cellById, contrastCell, intake } from "./content";
import { usePlacement } from "./lib/usePlacement";
import { useTheme } from "./lib/theme";
import { Placement } from "./screens/Placement";
import { Blueprint, type BlueprintTab } from "./screens/Blueprint";
import { Deviation, type Decisions } from "./screens/Deviation";
import { Payoff } from "./screens/Payoff";
import { Button, cx, FictionalBadge, Icon } from "./components/ui";
import { CueContext, cueRing, type ActiveCue } from "./lib/cues";
import type { CueId, Profile } from "../shared/schema";
import { defaultProfile, isDemoRecord, loadStoredRecord, storeRecord, type CellRef, type RecordState } from "./lib/record";
import { RecordPanel } from "./components/RecordPanel";
import { ComparePanel } from "./components/ComparePanel";
import { entryFromOpenRecord, type CompareEntry } from "./lib/compare";

// A stored working copy is only trusted if every answer is still a valid option.
function initialRecord(): RecordState | null {
  const r = loadStoredRecord();
  if (!r?.profile || !r.answers || !r.claimed) return null;
  const ok = intake.questions.every((q) => q.options.some((o) => o.id === r.answers[q.id]));
  return ok ? { ...r, profile: { ...defaultProfile(), ...r.profile }, questionNotes: r.questionNotes ?? {}, notes: r.notes ?? "" } : null;
}

type Mode = "guided" | "explore";
const tour = config.tour;

const HINTS_KEY = "sbd-hints";
function readHints(): boolean {
  try {
    return localStorage.getItem(HINTS_KEY) !== "off";
  } catch {
    return true;
  }
}

function stepFromHash(): number {
  const id = location.hash.replace(/^#\/?/, "");
  const i = tour.findIndex((t) => t.id === id);
  return i === -1 ? 0 : i;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("guided");
  const [step, setStepRaw] = useState(stepFromHash);
  // Every session starts on the fictional client. A saved customer record is offered to resume, never auto-loaded.
  const [answers, setAnswers] = useState<Record<string, string>>({ ...meridianAnswers });
  const [claimed, setClaimed] = useState<CellRef>({ ...intake.claim.meridian });
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareEntries, setCompareEntries] = useState<CompareEntry[]>([]);
  const [saved, setSaved] = useState(initialRecord);
  const [decisions, setDecisions] = useState<Decisions>({});
  const placement = usePlacement(answers);
  const { theme, toggle } = useTheme();
  const [hints, setHints] = useState(readHints);
  const [cuesDone, setCuesDone] = useState<ReadonlySet<CueId>>(new Set());
  const [dwellStep, setDwellStep] = useState(-1);

  const current = tour[step];
  const setStep = useCallback((i: number) => {
    const next = Math.max(0, Math.min(tour.length - 1, i));
    setStepRaw(next);
    history.replaceState(null, "", `#/${tour[next].id}`);
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, []);

  // Keyboard: arrows (and presenter clickers' PageUp/PageDown) move through the tour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, select, textarea, [contenteditable=true]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setStep(step + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setStep(step - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setStep]);

  useEffect(() => {
    const onHash = () => setStepRaw(stepFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HINTS_KEY, hints ? "on" : "off");
    } catch {
      /* storage unavailable; the setting still applies for this session */
    }
  }, [hints]);

  const complete = useCallback(
    (id: CueId) => setCuesDone((done) => (done.has(id) ? done : new Set(done).add(id))),
    [],
  );

  // Placement cues complete when the placement itself lands in the cell the cue points to.
  const placedDepth = placement.result ? cellById(placement.result.cell)?.depth : undefined;
  useEffect(() => {
    if (placedDepth === "contrast") complete("try-contrast");
    if (placedDepth === "coming") complete("try-coming");
    if (placedDepth === "deep" && cuesDone.has("try-contrast") && cuesDone.has("try-coming")) complete("return-meridian");
  }, [placedDepth, cuesDone, complete]);

  // Steps without cues suggest Next after a short pause, so the hint never rushes the room.
  useEffect(() => {
    const t = setTimeout(() => setDwellStep(step), 4000);
    return () => clearTimeout(t);
  }, [step]);

  const nextCue = current.cues?.find((c) => !cuesDone.has(c.id));
  const hasNext = step < tour.length - 1;
  const active: ActiveCue =
    mode !== "guided" || !hints ? null : nextCue ? nextCue.id : hasNext && (current.cues?.length || dwellStep === step) ? "next" : null;
  const cueText = !active ? undefined : nextCue ? nextCue.text : config.continueCue.replace("{title}", tour[step + 1].title);
  const cues = useMemo(() => ({ active, complete }), [active, complete]);

  const record: RecordState = { profile, claimed, answers, questionNotes, notes };
  const demo = isDemoRecord(profile);
  // A real customer's record keeps a browser copy so it can be resumed; the fictional demo is never saved.
  useEffect(() => {
    if (demo) return;
    const r = { profile, claimed, answers, questionNotes, notes };
    storeRecord(r);
    setSaved(r);
  }, [demo, profile, claimed, answers, questionNotes, notes]);
  const discardSaved = () => {
    storeRecord(null);
    setSaved(null);
  };

  const loadRecord = (r: RecordState) => {
    setProfile(r.profile);
    setClaimed(r.claimed);
    setAnswers(r.answers);
    setQuestionNotes(r.questionNotes);
    setNotes(r.notes);
  };
  const restoreMeridian = () => {
    setAnswers({ ...meridianAnswers });
    setClaimed({ ...intake.claim.meridian });
  };

  const restart = () => {
    setClaimed({ ...intake.claim.meridian });
    setAnswers({ ...meridianAnswers });
    setDecisions({});
    setCuesDone(new Set());
    setStep(0);
  };

  const goTab = (tab: BlueprintTab) => setStep(tour.findIndex((t) => t.blueprintTab === tab));
  const placedCell = placement.result ? cellById(placement.result.cell) : undefined;
  const offDeep = current.beat > 1 && placedCell && placedCell.id !== deepCell.id;

  return (
    <CueContext.Provider value={cues}>
    <div className="flex h-dvh flex-col bg-bg text-ink lg:flex-row">
      <Sidebar mode={mode} setMode={setMode} step={step} setStep={setStep} theme={theme} toggleTheme={toggle} hints={hints} setHints={setHints} onOpenRecord={() => setRecordOpen(true)} onOpenCompare={() => setCompareOpen(true)} compareCount={compareEntries.length} recordProfile={demo ? undefined : profile} resumeName={demo ? saved?.profile.name : undefined} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[110rem] px-4 py-6 sm:px-8 lg:px-10">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-accent-text">
                  Beat {current.beat} · {current.beatLabel}
                </div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">{current.title}</h1>
                {mode === "guided" && <p className="mt-2 max-w-3xl text-muted">{current.talkTrack}</p>}
                {cueText && (
                  <p key={cueText} className="mt-3 flex max-w-3xl items-center gap-2 text-sm font-medium text-accent-text animate-rise" role="status">
                    <span className="cue-dot" aria-hidden />
                    {cueText}
                  </p>
                )}
              </div>
              {demo ? (
                <FictionalBadge />
              ) : (
                <button type="button" onClick={() => setRecordOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent-soft px-3 py-1 text-xs text-accent-text">
                  <span className="font-semibold">{profile.name}</span>
                  <span aria-hidden>·</span>
                  <span className="font-medium uppercase tracking-wide">Customer record</span>
                </button>
              )}
            </header>

            {offDeep && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm">
                <span>
                  Edited answers place {client.shortName} in {placedCell!.title}
                  {placedCell!.id === contrastCell.id ? " (contrast cell)" : " (blueprint in development)"}. This walkthrough continues with {client.shortName}'s cell, {deepCell.title}.
                </span>
                <Button onClick={restoreMeridian}>
                  <Icon name="reset" /> Restore {client.shortName}'s answers
                </Button>
              </div>
            )}

            {current.id === "placement" && (
              <Placement
                answers={answers}
                setAnswers={setAnswers}
                claimed={claimed}
                setClaimed={setClaimed}
                customerName={demo ? client.shortName : profile.name}
                onRestore={restoreMeridian}
                placement={placement}
                onOpenBlueprint={() => setStep(step + 1)}
                onOpenRecord={() => setRecordOpen(true)}
              />
            )}
            {current.blueprintTab && (
              <Blueprint tab={current.blueprintTab} onTab={goTab} notes={questionNotes} setNotes={setQuestionNotes} customerName={profile.name} />
            )}
            {current.id === "deviation" && <Deviation decisions={decisions} setDecisions={setDecisions} guided={mode === "guided"} />}
            {current.id === "payoff" && <Payoff guided={mode === "guided"} />}

            <footer className="mt-10 border-t border-line pt-4 text-xs text-muted">{client.figuresNote} No real client names or data.</footer>
          </div>
        </main>

        {mode === "guided" && <TourBar step={step} setStep={setStep} onRestart={restart} active={active} />}
      </div>
      {compareOpen && (
        <ComparePanel
          entries={compareEntries}
          setEntries={setCompareEntries}
          openRecordEntry={() => (demo ? null : entryFromOpenRecord(record, placement.result))}
          onClose={() => setCompareOpen(false)}
        />
      )}
      {recordOpen && (
        <RecordPanel
          record={record}
          placement={placement.result}
          setProfile={setProfile}
          setNotes={setNotes}
          onLoad={loadRecord}
          saved={demo ? saved : null}
          onDiscardSaved={discardSaved}
          onClose={() => setRecordOpen(false)}
        />
      )}
    </div>
    </CueContext.Provider>
  );
}

function Sidebar({
  mode,
  setMode,
  step,
  setStep,
  theme,
  toggleTheme,
  hints,
  setHints,
  onOpenRecord,
  onOpenCompare,
  compareCount,
  recordProfile,
  resumeName,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  step: number;
  setStep: (i: number) => void;
  theme: string;
  toggleTheme: () => void;
  hints: boolean;
  setHints: (h: boolean) => void;
  onOpenRecord: () => void;
  onOpenCompare: () => void;
  compareCount: number;
  recordProfile?: Profile;
  resumeName?: string;
}) {
  const recordName = recordProfile?.name;
  const beats = [1, 2, 3, 4].map((b) => ({ beat: b, steps: tour.map((t, i) => ({ ...t, index: i })).filter((t) => t.beat === b) }));
  const current = tour[step];
  const explore = mode === "explore";

  return (
    <aside className="flex shrink-0 flex-col bg-side text-side-ink lg:h-dvh lg:w-64 lg:overflow-y-auto 2xl:w-72">
      <div className="border-b border-side-line px-5 py-4 lg:py-5">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <div>
            <div className="font-semibold leading-tight">{config.appTitle}</div>
            <div className="text-xs text-side-muted">{config.appSubtitle}</div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 rounded-lg bg-side-2 p-1 text-sm" role="radiogroup" aria-label="Mode">
          {(["guided", "explore"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cx("whitespace-nowrap rounded-md px-2 py-1.5 font-medium transition", mode === m ? "bg-side-ink text-side" : "text-side-muted hover:text-side-ink")}
            >
              {m === "guided" ? "Guided Tour" : "Explore"}
            </button>
          ))}
        </div>
      </div>

      <nav aria-label="Beats" className="hidden flex-1 px-3 py-4 lg:block">
        <ol className="space-y-1">
          {beats.map(({ beat, steps }) => {
            const active = current.beat === beat;
            const done = current.beat > beat;
            return (
              <li key={beat}>
                <button
                  type="button"
                  disabled={!explore}
                  onClick={() => setStep(steps[0].index)}
                  aria-current={active ? "step" : undefined}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition",
                    active ? "bg-side-2 text-side-ink" : "text-side-muted",
                    explore && "hover:bg-side-2 hover:text-side-ink",
                    !explore && "cursor-default",
                  )}
                >
                  <span
                    className={cx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      active ? "border-accent bg-accent text-accent-ink" : done ? "border-side-muted text-side-ink" : "border-side-line",
                    )}
                  >
                    {done ? <Icon name="check" className="h-3.5 w-3.5" /> : beat}
                  </span>
                  <span className="font-medium">{steps[0].beatLabel}</span>
                </button>
                {steps.length > 1 && (active || explore) && (
                  <ol className="mb-1 ml-[1.35rem] mt-0.5 space-y-0.5 border-l border-side-line pl-4">
                    {steps.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={!explore && !active}
                          onClick={() => setStep(s.index)}
                          className={cx(
                            "w-full rounded-md px-2 py-1 text-left text-xs transition",
                            s.index === step ? "text-side-ink" : "text-side-muted hover:text-side-ink",
                          )}
                        >
                          {s.title}
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
        {!explore && (
          <>
            <p className="mt-3 px-2 text-xs text-side-muted">Use Next, Back, or the arrow keys. Switch to Explore to jump anywhere.</p>
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-side-muted hover:text-side-ink">
              <span>Hints for the next move</span>
              <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} className="h-4 w-4 cursor-pointer accent-[var(--accent)]" />
            </label>
          </>
        )}
      </nav>

      <div className="space-y-3 px-5 py-3 lg:border-t lg:border-side-line lg:py-4">
        <button
          type="button"
          onClick={onOpenRecord}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-side-line bg-side-2 px-3 py-2 text-left text-sm font-semibold text-side-ink transition hover:border-side-muted"
        >
          <span className="min-w-0">
            <span className="block">Customer record</span>
            <span className="block truncate text-xs font-normal text-side-muted">{recordName ?? (resumeName ? `Resume ${resumeName}` : "Capture, export, or reimport")}</span>
          </span>
          <Icon name="download" />
        </button>
        <button
          type="button"
          onClick={onOpenCompare}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-side-line px-3 py-2 text-left text-sm font-semibold text-side-ink transition hover:border-side-muted"
        >
          <span className="min-w-0">
            <span className="block">Compare customers</span>
            <span className="block truncate text-xs font-normal text-side-muted">
              {compareCount ? `${compareCount} loaded` : "By industry and TOM maturity"}
            </span>
          </span>
          <span aria-hidden>→</span>
        </button>
        {recordProfile ? (
          <div className="hidden rounded-lg bg-side-2 p-3 lg:block">
            <div className="text-sm font-semibold">{recordProfile.name}</div>
            <div className="mt-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-side-muted">Customer record</div>
            <dl className="mt-2 space-y-0.5 text-xs">
              {(
                [
                  ["Industry", recordProfile.industry],
                  ["Revenue", recordProfile.revenue],
                  ["Field technicians", recordProfile.technicians],
                  ["Branches", recordProfile.branches],
                ] as const
              )
                .filter(([, v]) => v.trim())
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-side-muted">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
            </dl>
            <p className="mt-2 text-[0.7rem] text-side-muted">{client.record.notice}</p>
          </div>
        ) : (
        <div className="hidden rounded-lg bg-side-2 p-3 lg:block">
          <div className="text-sm font-semibold">{client.name}</div>
          <div className="mt-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-side-muted">{client.fictionalBadge}</div>
          <p className="mt-2 text-xs leading-relaxed text-side-muted">{client.descriptor}</p>
          <dl className="mt-2 space-y-0.5 text-xs">
            {client.profile.map((p) => (
              <div key={p.label} className="flex justify-between gap-2">
                <dt className="text-side-muted">{p.label}</dt>
                <dd>{p.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[0.7rem] text-side-muted">{client.figuresNote}</p>
        </div>
        )}
        <div className="flex items-center justify-between text-xs text-side-muted">
          <span>
            {config.practiceScope}
            <br />
            {config.nextGrid}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md p-2 text-side-muted transition hover:bg-side-2 hover:text-side-ink"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TourBar({ step, setStep, onRestart, active }: { step: number; setStep: (i: number) => void; onRestart: () => void; active: ActiveCue }) {
  const last = step === tour.length - 1;
  return (
    <div className="border-t border-line bg-surface px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-[110rem] items-center gap-4">
        <Button className="shrink-0" onClick={() => setStep(step - 1)} disabled={step === 0} aria-label="Back">
          <Icon name="arrowLeft" /> Back
        </Button>
        <ol className="hidden min-w-0 flex-1 items-center gap-1.5 md:flex" aria-label="Tour progress">
          {tour.map((t, i) => (
            <li key={t.id} className="min-w-0 flex-1">
              <button type="button" onClick={() => setStep(i)} className="group block w-full text-left" aria-current={i === step ? "step" : undefined}>
                <div className={cx("h-1 rounded-full transition", i <= step ? "bg-accent" : "bg-surface-2 group-hover:bg-line")} />
                <div className={cx("mt-1 truncate text-[0.7rem]", i === step ? "font-semibold text-ink" : "text-muted")}>{t.title}</div>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex-1 md:hidden" />
        <span className="hidden shrink-0 text-xs text-muted 2xl:inline">← → keys</span>
        <Button variant="primary" className={cx("shrink-0", cueRing(active, "next"))} onClick={() => (last ? onRestart() : setStep(step + 1))}>
          {last ? "Restart tour" : "Next"} <Icon name={last ? "reset" : "arrowRight"} />
        </Button>
      </div>
    </div>
  );
}
