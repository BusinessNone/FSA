import { useState } from "react";
import { client, contrastBlueprint, contrastCell, deepBlueprint as bp, deepCell } from "../content";
import type { Kpi } from "../../shared/schema";
import { copyText, downloadText, questionSetMarkdown } from "../lib/markdown";
import { Button, Card, cx, Icon, SectionLabel, Tag } from "../components/ui";
import { cueRing, useCues } from "../lib/cues";

export type BlueprintTab = "jobs" | "kpis" | "questions" | "process";

const tabs: { id: BlueprintTab; label: string }[] = [
  { id: "jobs", label: "Jobs to be done" },
  { id: "kpis", label: "KPIs" },
  { id: "questions", label: "Question Set" },
  { id: "process", label: "Baseline Process" },
];

interface Props {
  tab: BlueprintTab;
  onTab: (t: BlueprintTab) => void;
  notes: Record<string, string>;
  setNotes: (n: Record<string, string>) => void;
  customerName: string;
}

export function Blueprint({ tab, onTab, notes, setNotes, customerName }: Props) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <SectionLabel>Blueprint</SectionLabel>
          <Tag tone="accent">{deepCell.title}</Tag>
        </div>
        <p className="mt-2 max-w-4xl text-lg leading-relaxed">{bp.summary}</p>
      </Card>

      <div role="tablist" aria-label="Blueprint sections" className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => onTab(t.id)}
            className={cx(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="animate-rise" key={tab}>
        {tab === "jobs" && <Jobs />}
        {tab === "kpis" && <Kpis />}
        {tab === "questions" && <Questions notes={notes} setNotes={setNotes} customerName={customerName} />}
        {tab === "process" && <Process />}
      </div>
    </div>
  );
}

const areaLabel = (id: string) => bp.processAreas.find((a) => a.id === id)?.label ?? id;

function Jobs() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {bp.tiers.map((t) => (
        <section key={t.tier} className="min-w-0">
          <div className={cx("mb-3 rounded-lg border-l-4 px-3 py-2", t.tier === 1 ? "border-accent bg-accent-soft" : "border-line bg-surface-2")}>
            <div className="font-semibold">{t.label}</div>
            <div className="text-sm text-muted">{t.description}</div>
          </div>
          <ul className="space-y-2.5">
            {bp.jobs
              .filter((j) => j.tier === t.tier)
              .map((j) => (
                <li key={j.id}>
                  <Card className="p-3.5">
                    <div className="font-medium leading-snug">{j.title}</div>
                    <p className="mt-1 text-sm text-muted">{j.detail}</p>
                    <Tag className="mt-2">{areaLabel(j.area)}</Tag>
                  </Card>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Direction({ kpi }: { kpi: Kpi }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
      <Icon name={kpi.direction === "higher" ? "arrowUp" : "arrowDown"} className="h-3.5 w-3.5" />
      {kpi.direction === "higher" ? "Higher is better" : "Lower is better"}
    </span>
  );
}

function Kpis() {
  const [compare, setCompare] = useState(false);
  const { active, complete } = useCues();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Definitions and direction only. No benchmark values.</p>
        <Button
          className={cueRing(active, "compare-kpis")}
          onClick={() => {
            setCompare((c) => !c);
            complete("compare-kpis");
          }}
          aria-pressed={compare}
        >
          {compare ? "Hide comparison" : `Compare with ${contrastCell.title}`}
        </Button>
      </div>

      {compare && (
        <Card className="grid gap-4 p-4 md:grid-cols-2 animate-rise">
          <div>
            <Tag tone="accent">{deepCell.title}</Tag>
            <ul className="mt-3 space-y-1.5 text-sm">
              {bp.kpis.map((k) => (
                <li key={k.id} className="font-medium">{k.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <Tag>{contrastCell.title}</Tag>
            <ul className="mt-3 space-y-1.5 text-sm">
              {contrastBlueprint.kpis.map((k) => (
                <li key={k.id} className="font-medium">{k.name}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">{contrastBlueprint.contrastLine}</p>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {bp.kpis.map((k) => (
          <Card key={k.id} className="flex flex-col p-4">
            <div className="font-semibold leading-snug">{k.name}</div>
            <Direction kpi={k} />
            <p className="mt-2 text-sm">{k.definition}</p>
            <div className="mt-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Why it matters here</div>
              <p className="mt-0.5 text-muted">{k.whyItMatters}</p>
            </div>
            <div className="mt-3 border-t border-line pt-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">What good looks like</div>
              <p className="mt-0.5">{k.whatGoodLooksLike}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Questions({ notes, setNotes, customerName }: { notes: Record<string, string>; setNotes: (n: Record<string, string>) => void; customerName: string }) {
  const [area, setArea] = useState<string>(bp.processAreas[0].id);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const { active, complete } = useCues();
  const markdown = () =>
    questionSetMarkdown(bp, customerName, customerName === client.name ? client.fictionalBadge.toLowerCase() : "customer record", notes);
  const numbered = bp.processAreas.flatMap((a) => bp.questionSet.filter((q) => q.area === a.id));
  const shown = area === "all" ? numbered : numbered.filter((q) => q.area === area);

  const copy = async () => {
    setCopied((await copyText(markdown())) ? "ok" : "fail");
    complete("copy-questions");
    setTimeout(() => setCopied("idle"), 2200);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Process areas" className="space-y-1 lg:sticky lg:top-4 lg:self-start">
        {[...bp.processAreas, { id: "all", label: "All areas" }].map((a) => {
          const count = a.id === "all" ? numbered.length : numbered.filter((q) => q.area === a.id).length;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setArea(a.id)}
              aria-current={area === a.id}
              className={cx(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                area === a.id ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {a.label}
              <span className="text-xs tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
        <div className="space-y-2 pt-4">
          <Button variant="primary" onClick={copy} className={cx("w-full", cueRing(active, "copy-questions"))}>
            <Icon name={copied === "ok" ? "check" : "copy"} />
            {copied === "ok" ? "Copied as Markdown" : copied === "fail" ? "Copy blocked; use Download" : "Copy question set"}
          </Button>
          <Button
            onClick={() => {
              downloadText("question-set-profit-center-equipment.md", markdown());
              complete("copy-questions");
            }}
            className="w-full"
          >
            <Icon name="download" /> Download .md
          </Button>
        </div>
      </nav>

      <ol className="space-y-3">
        {shown.map((q) => (
          <li key={q.id}>
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-sm font-semibold text-muted tabular-nums">{numbered.indexOf(q) + 1}</span>
                <div className="min-w-0 flex-1">
                  {area === "all" && <Tag className="mb-2">{areaLabel(q.area)}</Tag>}
                  <p className="text-lg font-medium leading-snug">"{q.question}"</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                        <Icon name="question" className="h-3.5 w-3.5" /> Why we ask
                      </div>
                      <p className="mt-1 text-sm">{q.whyWeAsk}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-text">
                        <Icon name="check" className="h-3.5 w-3.5" /> What a good answer sounds like
                      </div>
                      <p className="mt-1 text-sm">{q.goodAnswer}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warn">
                        <Icon name="flag" className="h-3.5 w-3.5" /> Red-flag answers
                      </div>
                      <ul className="mt-1 space-y-2 text-sm">
                        {q.redFlags.map((rf) => (
                          <li key={rf.answer}>
                            <div className="font-medium">{rf.answer}</div>
                            <div className="text-muted">Signals: {rf.signals}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <label className="mt-4 block">
                    <span className="sr-only">Notes from the call</span>
                    <textarea
                      value={notes[q.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                      rows={notes[q.id] ? 3 : 1}
                      placeholder="Notes from the call: what the customer actually said"
                      className="w-full resize-y rounded border border-line bg-surface-2/50 px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:bg-surface"
                    />
                  </label>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Process() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag tone="accent">
          <Icon name="check" className="h-3.5 w-3.5" /> {bp.process.label}
        </Tag>
        <span className="text-sm text-muted">{bp.process.note}</span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-9">
        {bp.process.steps.map((s, i) => (
          <li key={s.id} className="relative">
            <Card className="flex h-full flex-col p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink tabular-nums">
                  {i + 1}
                </span>
                <span className="font-semibold leading-tight">{s.name}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{s.description}</p>
              <div className="mt-3 flex gap-1.5 border-t border-line pt-2.5 text-xs">
                <Icon name="shield" className="mt-px h-3.5 w-3.5 shrink-0 text-accent-text" />
                <span>{s.guardrail}</span>
              </div>
            </Card>
            {i < bp.process.steps.length - 1 && (
              <Icon name="arrowRight" className="absolute -right-2.5 top-5 z-10 hidden h-4 w-4 text-muted 2xl:block" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
