// All demo content comes from /content/*.json (validated at build time by scripts/validate-content.ts).
import type { Client, Compare, Config, ContrastBlueprint, DeepBlueprint, Deviations, Grid, Intake, Payoff } from "../shared/schema";
import { cellId } from "../shared/api";
import configJson from "../content/config.json";
import clientJson from "../content/client.json";
import gridJson from "../content/grid.json";
import intakeJson from "../content/intake.json";
import deviationsJson from "../content/deviations.json";
import payoffJson from "../content/payoff.json";
import compareJson from "../content/compare.json";

export const config = configJson as Config;
export const client = clientJson as Client;
export const grid = gridJson as Grid;
export const intake = intakeJson as Intake;
export const deviations = deviationsJson as Deviations;
export const payoff = payoffJson as Payoff;
export const compare = compareJson as Compare;

const blueprints = import.meta.glob<{ default: unknown }>("../content/blueprint-*.json", { eager: true });
const blueprintFor = (id: string) => blueprints[`../content/blueprint-${id}.json`]?.default;

export type GridCell = Grid["cells"][number] & { id: string; title: string };

export const cells: GridCell[] = grid.cells.map((c) => ({
  ...c,
  id: cellId(c.row, c.column),
  title: `${grid.rows.find((r) => r.id === c.row)!.label} × ${grid.columns.find((k) => k.id === c.column)!.label}`,
}));

export const cellById = (id: string) => cells.find((c) => c.id === id);
export const deepCell = cells.find((c) => c.depth === "deep")!;
export const contrastCell = cells.find((c) => c.depth === "contrast")!;
export const deepBlueprint = blueprintFor(deepCell.id) as DeepBlueprint;
export const contrastBlueprint = blueprintFor(contrastCell.id) as ContrastBlueprint;

export const meridianAnswers: Record<string, string> = Object.fromEntries(
  intake.questions.map((q) => [q.id, q.meridianAnswer]),
);
