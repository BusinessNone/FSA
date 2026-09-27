// Customer record: everything captured in a session, exported as files the team keeps.
// Nothing is sent to the site. A working copy is kept in this browser only.
import type { Profile } from "../../shared/schema";
import type { PlacementResponse } from "../../shared/api";
import { cellId } from "../../shared/api";
import { cellById, cells, client, deepBlueprint, grid, intake } from "../content";

export interface CellRef {
  row: string;
  column: string;
}

export interface RecordState {
  profile: Profile;
  claimed: CellRef;
  answers: Record<string, string>;
  questionNotes: Record<string, string>;
  notes: string;
}

export const RECORD_SCHEMA = "service-blueprint-record/v1";
const STORAGE_KEY = "sbd-record";

export const defaultProfile = (): Profile => ({ ...client.record.profile });

export const isDemoRecord = (profile: Profile) => profile.name.trim() === client.record.profile.name;

export function exportRecord(state: RecordState, placement?: PlacementResponse) {
  const claimedId = cellId(state.claimed.row, state.claimed.column);
  const claimedCell = cellById(claimedId);
  const actualCell = placement ? cellById(placement.cell) : undefined;
  return {
    schema: RECORD_SCHEMA,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    claimed: { cell: claimedId, title: claimedCell?.title, coherence: claimedCell?.coherence },
    actual: actualCell
      ? { cell: actualCell.id, title: actualCell.title, coherence: actualCell.coherence, signal: actualCell.signal, rationale: placement!.rationale }
      : null,
    gap: actualCell ? actualCell.id !== claimedId : null,
    answers: intake.questions.map((q) => ({
      id: q.id,
      topic: q.short,
      question: q.prompt,
      answerId: state.answers[q.id],
      answer: q.options.find((o) => o.id === state.answers[q.id])?.label ?? "",
    })),
    questionNotes: deepBlueprint.questionSet
      .filter((q) => state.questionNotes[q.id]?.trim())
      .map((q) => ({
        id: q.id,
        area: deepBlueprint.processAreas.find((a) => a.id === q.area)?.label,
        question: q.question,
        note: state.questionNotes[q.id].trim(),
      })),
    notes: state.notes.trim(),
  };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// One row per fact, so records from many customers stack cleanly in one spreadsheet.
export function recordToCsv(rec: ReturnType<typeof exportRecord>): string {
  const rows: unknown[][] = [["customer", "section", "field", "value"]];
  const name = rec.profile.name;
  const push = (section: string, field: string, value: unknown) => rows.push([name, section, field, value]);
  push("record", "exported_at", rec.exportedAt);
  for (const [k, v] of Object.entries(rec.profile)) push("profile", k, v);
  push("placement", "claimed_cell", rec.claimed.title);
  push("placement", "actual_cell", rec.actual?.title);
  push("placement", "actual_coherence", rec.actual?.coherence);
  push("placement", "gap", rec.gap === null ? "" : rec.gap ? "yes" : "no");
  push("placement", "rationale", rec.actual?.rationale);
  for (const a of rec.answers) push("answers", a.topic, a.answer);
  for (const n of rec.questionNotes) push(`notes: ${n.area}`, n.question, n.note);
  if (rec.notes) push("notes", "general", rec.notes);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export const recordFileName = (profile: Profile, ext: string) => {
  const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "customer";
  return `${slug}-service-record-${new Date().toISOString().slice(0, 10)}.${ext}`;
};

const validCell = (c: unknown): c is CellRef =>
  !!c &&
  typeof c === "object" &&
  grid.rows.some((r) => r.id === (c as CellRef).row) &&
  grid.columns.some((k) => k.id === (c as CellRef).column);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((c) => c !== ""));
}

// Turn an exported CSV back into the JSON record shape. With several customers in one
// sheet, the first customer's rows are used.
function csvToRecordData(text: string) {
  const [header, ...rows] = parseCsv(text);
  if (header?.join(",") !== "customer,section,field,value") throw new Error("Not a Service Blueprint CSV export");
  const first = rows[0]?.[0];
  const mine = rows.filter((r) => r[0] === first);
  const profile: Record<string, string> = {};
  const answers: { id: string; answerId: string }[] = [];
  const questionNotes: { id: string; note: string }[] = [];
  let claimedCell = "";
  let notes = "";
  for (const [, section, field, value] of mine) {
    if (section === "profile") profile[field] = value;
    else if (section === "placement" && field === "claimed_cell") claimedCell = cells.find((c) => c.title === value)?.id ?? "";
    else if (section === "answers") {
      const q = intake.questions.find((x) => x.short === field);
      const o = q?.options.find((x) => x.label === value);
      if (q && o) answers.push({ id: q.id, answerId: o.id });
    } else if (section.startsWith("notes: ")) {
      const q = deepBlueprint.questionSet.find((x) => x.question === field);
      if (q) questionNotes.push({ id: q.id, note: value });
    } else if (section === "notes" && field === "general") notes = value;
  }
  return { schema: RECORD_SCHEMA, profile, claimed: { cell: claimedCell }, answers, questionNotes, notes };
}

// Reopen an exported record (JSON or CSV). Unknown or invalid parts fall back to defaults.
export function importRecord(text: string, fallback: RecordState): RecordState {
  const trimmed = text.trimStart();
  const data = trimmed.startsWith("{") ? JSON.parse(trimmed) : csvToRecordData(text);
  if (data?.schema !== RECORD_SCHEMA) throw new Error("Not a Service Blueprint record");
  const answers = { ...fallback.answers };
  for (const a of data.answers ?? []) {
    const q = intake.questions.find((x) => x.id === a.id);
    if (q?.options.some((o) => o.id === a.answerId)) answers[q.id] = a.answerId;
  }
  const [row, column] = String(data.claimed?.cell ?? "").split("__");
  const questionNotes: Record<string, string> = {};
  for (const n of data.questionNotes ?? []) if (typeof n?.id === "string" && typeof n?.note === "string") questionNotes[n.id] = n.note;
  const profile = { ...defaultProfile() };
  for (const k of Object.keys(profile) as (keyof Profile)[]) if (typeof data.profile?.[k] === "string") profile[k] = data.profile[k];
  return {
    profile,
    claimed: validCell({ row, column }) ? { row, column } : fallback.claimed,
    answers,
    questionNotes,
    notes: typeof data.notes === "string" ? data.notes : "",
  };
}

export function loadStoredRecord(): RecordState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecordState) : null;
  } catch {
    return null;
  }
}

export function storeRecord(state: RecordState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable; export still works */
  }
}
