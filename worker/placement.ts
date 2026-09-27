// Placement scoring. Runs only inside the Worker; the rubric never reaches the browser.
import rubricJson from "./placement-rubric.json";
import { cellId, type Answers, type PlacementResponse } from "../shared/api";

type Tally = Record<string, number>;
interface Signal {
  row?: Tally;
  column?: Tally;
}
interface Rubric {
  rows: string[];
  columns: string[];
  signals: Record<string, Record<string, Signal>>;
  closeCallRatio: number;
  rationale: {
    row: Record<string, string>;
    column: Record<string, string>;
    closeCall: { row: string; column: string };
    labels: Record<string, string>;
  };
}

export const rubric = rubricJson as Rubric;

export class PlacementError extends Error {}

// Highest score wins. Ties go to the axis order in the rubric (deep cell first).
function rank(order: string[], tally: Tally) {
  const sorted = [...order].sort((a, b) => (tally[b] ?? 0) - (tally[a] ?? 0) || order.indexOf(a) - order.indexOf(b));
  const [winner, runnerUp] = sorted;
  return { winner, runnerUp, top: tally[winner] ?? 0, second: tally[runnerUp] ?? 0 };
}

export function place(answers: Answers, r: Rubric = rubric): PlacementResponse {
  const rowTally: Tally = {};
  const columnTally: Tally = {};

  for (const [questionId, options] of Object.entries(r.signals)) {
    const answer = answers[questionId];
    if (answer === undefined) throw new PlacementError(`Missing answer: ${questionId}`);
    const signal = options[answer];
    if (!signal) throw new PlacementError(`Unknown answer for ${questionId}`);
    for (const [k, v] of Object.entries(signal.row ?? {})) rowTally[k] = (rowTally[k] ?? 0) + v;
    for (const [k, v] of Object.entries(signal.column ?? {})) columnTally[k] = (columnTally[k] ?? 0) + v;
  }

  const row = rank(r.rows, rowTally);
  const column = rank(r.columns, columnTally);

  const sentences = [r.rationale.row[row.winner], r.rationale.column[column.winner]];
  const isClose = (x: { top: number; second: number }) => x.second > 0 && x.second >= x.top * r.closeCallRatio;
  if (isClose(row)) {
    sentences.push(r.rationale.closeCall.row.replace("{label}", r.rationale.labels[row.runnerUp]));
  } else if (isClose(column)) {
    sentences.push(r.rationale.closeCall.column.replace("{label}", r.rationale.labels[column.runnerUp]));
  }

  return { cell: cellId(row.winner, column.winner), rationale: sentences.join(" ") };
}
