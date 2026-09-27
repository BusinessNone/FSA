import { useState } from "react";
import { config, deviations } from "../content";
import type { DeviationRequest } from "../../shared/schema";
import { Button, Card, cx, Icon, IllustrativeTag, SectionLabel, Tag } from "../components/ui";

export type Decision = "accept" | "hold" | "defer";
export type Decisions = Record<string, Decision | undefined>;

const choices: { id: Decision; label: string }[] = [
  { id: "accept", label: "Accept (build it)" },
  { id: "hold", label: "Hold the blueprint" },
  { id: "defer", label: "Defer to Phase 2" },
];

// Risk grows with one-time effort plus every ongoing burden the project has to carry.
const riskOf = (r: DeviationRequest) => deviations.effortUnits[r.effort] + r.ongoingBurden.length * 2;
const maxRisk = deviations.requests.reduce((s, r) => s + riskOf(r), 0);

export function tally(decisions: Decisions) {
  const accepted = deviations.requests.filter((r) => decisions[r.id] === "accept");
  const risk = accepted.reduce((s, r) => s + riskOf(r), 0);
  const levelIndex = deviations.riskLevels.findIndex((l) => risk <= l.upTo);
  return {
    crims: accepted.length,
    deferred: deviations.requests.filter((r) => decisions[r.id] === "defer").length,
    held: deviations.requests.filter((r) => decisions[r.id] === "hold").length,
    effort: accepted.reduce((s, r) => s + deviations.effortUnits[r.effort], 0),
    risk,
    level: deviations.riskLevels[levelIndex === -1 ? deviations.riskLevels.length - 1 : levelIndex],
    levelIndex: levelIndex === -1 ? deviations.riskLevels.length - 1 : levelIndex,
    allAccepted: accepted.length === deviations.requests.length,
  };
}

interface Props {
  decisions: Decisions;
  setDecisions: (d: Decisions) => void;
  guided?: boolean;
}

export function Deviation({ decisions, setDecisions, guided }: Props) {
  const t = tally(decisions);
  const decide = (id: string, d: Decision) => setDecisions({ ...decisions, [id]: decisions[id] === d ? undefined : d });
  const acceptAll = () => setDecisions(Object.fromEntries(deviations.requests.map((r) => [r.id, "accept" as Decision])));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-muted">{guided ? "" : deviations.intro}</p>
        <div className="flex gap-2">
          <Button onClick={acceptAll}>Accept all</Button>
          <Button variant="ghost" onClick={() => setDecisions({})}>
            <Icon name="reset" /> Reset
          </Button>
        </div>
      </div>

      <Tally t={t} />

      {t.allAccepted && (
        <Card className="animate-rise border-danger/60 bg-danger-soft p-5">
          <p className="text-xl font-semibold text-danger">{deviations.punchline}</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {deviations.requests.map((r) => (
          <RequestCard key={r.id} r={r} decision={decisions[r.id]} onDecide={(d) => decide(r.id, d)} />
        ))}
      </div>
    </div>
  );
}

function Tally({ t }: { t: ReturnType<typeof tally> }) {
  const pct = Math.round((t.risk / maxRisk) * 100);
  const tone = t.levelIndex >= 3 ? "danger" : t.levelIndex >= 2 ? "warn" : "accent";
  const bar = { accent: "bg-accent", warn: "bg-warn", danger: "bg-danger" }[tone];
  return (
    <Card className="z-20 p-4 shadow-sm md:sticky md:top-0">
      <div className="grid grid-cols-3 items-center gap-4 md:grid-cols-[auto_auto_auto_minmax(0,1fr)]">
        <Stat label={`${config.crim.acronym}s created`} value={t.crims} emphasize={t.crims > 0} />
        <Stat label="Deferred to Phase 2" value={t.deferred} />
        <Stat label="One-time effort (relative units, illustrative)" value={t.effort} />
        <div className="col-span-3 min-w-0 md:col-span-1 md:pl-4">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Delivery risk</SectionLabel>
            <IllustrativeTag />
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={t.level.label}>
            <div key={t.level.label} className={cx("h-full rounded-full transition-all duration-700 ease-out", bar, t.levelIndex >= 3 && "animate-spike")} style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className={cx("font-semibold", { accent: "text-ink", warn: "text-warn", danger: "text-danger" }[tone])}>{t.level.label}</span>
            <span className="text-muted">{t.level.description}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        {config.crim.acronym}: {config.crim.expansion}. Effort and risk are relative and illustrative; no dollar values.
      </p>
    </Card>
  );
}

function Stat({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className="md:border-r md:border-line md:pr-6">
      <div key={value} className={cx("text-3xl font-semibold tabular-nums animate-rise", emphasize && "text-danger")}>
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function RequestCard({ r, decision, onDecide }: { r: DeviationRequest; decision?: Decision; onDecide: (d: Decision) => void }) {
  const [askWhy, setAskWhy] = useState(false);
  const effortTone = r.effort === "High" ? "danger" : r.effort === "Med" ? "warn" : "neutral";
  return (
    <Card
      className={cx(
        "flex flex-col p-5 transition",
        decision === "accept" && "border-danger/60",
        decision === "hold" && "border-accent/60",
        decision === "defer" && "opacity-75",
      )}
    >
      <p className="text-lg font-semibold leading-snug">"{r.request}"</p>
      <p className="mt-1 text-sm text-muted">{r.context}</p>

      <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
        <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-accent">Blueprint alternative</div>
        {r.blueprintAlternative}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Creates a {config.crim.acronym}</dt>
          <dd className="mt-0.5 font-medium">{r.crimType}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">One-time effort</dt>
          <dd className="mt-0.5">
            <Tag tone={effortTone}>{r.effort}</Tag>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">Ongoing burden</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-1.5">
            {r.ongoingBurden.map((b) => (
              <Tag key={b}>{b}</Tag>
            ))}
          </dd>
          <dd className="mt-1.5 text-muted">{r.ongoingDetail}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <button type="button" onClick={() => setAskWhy((a) => !a)} aria-expanded={askWhy} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <Icon name="question" /> Ask why
        </button>
        {askWhy && (
          <ul className="mt-2 space-y-1.5 border-l-2 border-accent pl-3 text-sm animate-rise">
            {r.askWhy.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`Decision for: ${r.request}`}>
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onDecide(c.id)}
              aria-pressed={decision === c.id}
              className={cx(
                "rounded-lg border px-2 py-2 text-xs font-semibold leading-tight transition",
                decision === c.id
                  ? c.id === "accept"
                    ? "border-danger bg-danger text-white"
                    : c.id === "hold"
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-muted bg-muted text-surface"
                  : "border-line text-muted hover:border-muted hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
