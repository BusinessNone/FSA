import { cells, client, deepCell, payoff } from "../content";
import { Card, cx, Icon, SectionLabel, Tag } from "../components/ui";

export function Payoff({ guided }: { guided?: boolean }) {
  const tiers = [...payoff.ladder.tiers].sort((a, b) => b.rung - a.rung);
  return (
    <div className="space-y-6">
      {!guided && <p className="max-w-3xl text-muted">{payoff.intro}</p>}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[minmax(9rem,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] text-sm">
          <div className="border-b border-line bg-surface-2 p-3" />
          <div className="border-b border-l border-line bg-surface-2 p-3 font-semibold">{payoff.sides.blankPage}</div>
          <div className="border-b border-l border-line bg-accent-soft p-3 font-semibold text-accent-text">{payoff.sides.blueprint}</div>
          {payoff.comparison.map((row, i) => (
            <div key={row.id} className="contents">
              <div className={cx("p-3 font-semibold", i > 0 && "border-t border-line")}>{row.dimension}</div>
              <div className={cx("border-l border-line p-3 text-muted", i > 0 && "border-t")}>{row.blankPage}</div>
              <div className={cx("border-l border-line p-3", i > 0 && "border-t")}>{row.blueprint}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-2 px-3 py-2.5">
          <Tag tone="accent">{payoff.reference.label}</Tag>
          <span className="font-medium">{payoff.reference.text}</span>
          <span className="text-sm text-muted">The only quantified figure in this demo.</span>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>{payoff.staffing.label}</SectionLabel>
            <Tag>{payoff.staffing.note}</Tag>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5">
            <div className="mb-1 text-center text-sm font-semibold">{payoff.sides.blankPage}</div>
            <div />
            <div className="mb-1 text-center text-sm font-semibold text-accent-text">{payoff.sides.blueprint}</div>
            {payoff.staffing.levels.map((l) => (
              <div key={l.role} className="contents">
                <div className="flex justify-center">
                  <div className="h-6 rounded bg-muted/50 transition-all duration-700" style={{ width: `${Math.max(l.blankPage, 0.08) * 100}%` }} aria-hidden />
                </div>
                <div className="text-center text-xs font-medium text-muted">{l.role}</div>
                <div className="flex justify-center">
                  <div className="h-6 rounded bg-accent transition-all duration-700" style={{ width: `${Math.max(l.blueprint, 0.08) * 100}%` }} aria-hidden />
                </div>
              </div>
            ))}
            <div className="mt-2 text-center text-xs text-muted">Senior people design from scratch</div>
            <div />
            <div className="mt-2 text-center text-xs text-muted">Associates run the scripted method</div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionLabel>{payoff.ladder.title}</SectionLabel>
          <ol className="mt-4 space-y-2">
            {tiers.map((t) => {
              const here = t.depth === deepCell.depth;
              const tierCells = cells.filter((c) => c.depth === t.depth);
              return (
                <li
                  key={t.id}
                  className={cx(
                    "rounded-lg border p-4 transition",
                    here ? "border-accent bg-accent-soft ring-2 ring-accent" : "border-line bg-surface-2",
                  )}
                  style={{ marginLeft: `${(3 - t.rung) * 1.25}rem` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">{t.title}</div>
                    {here && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
                        <Icon name="pin" className="h-3.5 w-3.5" /> {client.shortName}: {deepCell.title}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">{t.description}</p>
                  {!here && (
                    <p className="mt-1 text-xs text-muted">
                      {t.depth === "coming" ? "Every other cell on the grid today." : tierCells.map((c) => c.title).join(", ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>


      <div className="py-6 text-center">
        <p className="animate-rise text-4xl font-semibold tracking-tight md:text-5xl">{payoff.close}</p>
      </div>
    </div>
  );
}
