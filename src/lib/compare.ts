// Compare customers by industry and TOM maturity. Everything is read from exported
// record files in this browser; nothing is uploaded.
import type { Maturity } from "../../shared/schema";
import { cellById, cells, compare, type GridCell } from "../content";
import { csvCell, exportRecord, parseCsv, recordToCsv, RECORD_SCHEMA, type RecordState } from "./record";
import type { PlacementResponse } from "../../shared/api";

export interface CompareEntry {
  key: string;
  name: string;
  industry: string;
  sector: string;
  revenue: string;
  technicians: string;
  branches: string;
  claimed?: GridCell;
  actual?: GridCell;
  maturity?: Maturity;
  source: string;
  sample?: boolean;
  exportedAt?: string;
  csvRows: string[][];
}

const CSV_HEADER = ["customer", "section", "field", "value"];

// Maturity comes from the TOM: the rating of the cell the answers land in, and whether
// the client describes itself accurately.
export function maturityOf(claimed?: GridCell, actual?: GridCell): Maturity | undefined {
  if (!actual) return undefined;
  if (actual.coherence === "aligned") return claimed && claimed.id !== actual.id ? "misread" : "coherent";
  return actual.coherence;
}

export const maturityRank = (m?: Maturity) => (m ? compare.maturity.findIndex((x) => x.id === m) : compare.maturity.length);

const keyOf = (name: string) => name.trim().toLowerCase();

function entry(fields: Omit<CompareEntry, "key" | "maturity">): CompareEntry {
  return { ...fields, key: keyOf(fields.name), maturity: maturityOf(fields.claimed, fields.actual) };
}

const cellByTitle = (title?: string) => (title ? cells.find((c) => c.title === title) : undefined);

function fromJsonRecord(rec: ReturnType<typeof exportRecord>, source: string): CompareEntry {
  const csv = parseCsv(recordToCsv(rec)).slice(1);
  return entry({
    name: rec.profile.name,
    industry: rec.profile.industry,
    sector: rec.profile.sector ?? "",
    revenue: rec.profile.revenue,
    technicians: rec.profile.technicians,
    branches: rec.profile.branches,
    claimed: rec.claimed?.cell ? cellById(rec.claimed.cell) : undefined,
    actual: rec.actual?.cell ? cellById(rec.actual.cell) : undefined,
    source,
    exportedAt: rec.exportedAt,
    csvRows: csv,
  });
}

function fromCsv(text: string, source: string): CompareEntry[] {
  const [header, ...rows] = parseCsv(text);
  if (header?.join(",") !== CSV_HEADER.join(",")) throw new Error(`${source} is not a Service Blueprint CSV export`);
  const byCustomer = new Map<string, string[][]>();
  for (const r of rows) byCustomer.set(r[0], [...(byCustomer.get(r[0]) ?? []), r]);
  return [...byCustomer.entries()].map(([name, rs]) => {
    const get = (section: string, field: string) => rs.find((r) => r[1] === section && r[2] === field)?.[3] ?? "";
    return entry({
      name,
      industry: get("profile", "industry"),
      sector: get("profile", "sector"),
      revenue: get("profile", "revenue"),
      technicians: get("profile", "technicians"),
      branches: get("profile", "branches"),
      claimed: cellByTitle(get("placement", "claimed_cell")),
      actual: cellByTitle(get("placement", "actual_cell")),
      source,
      exportedAt: get("record", "exported_at") || undefined,
      csvRows: rs,
    });
  });
}

// One file can hold one JSON record, a JSON array of records, or a CSV of many customers.
export function parseRecordFile(text: string, source: string): CompareEntry[] {
  const t = text.trimStart();
  if (t.startsWith("{") || t.startsWith("[")) {
    const data = JSON.parse(t);
    const list = Array.isArray(data) ? data : [data];
    return list.map((rec) => {
      if (rec?.schema !== RECORD_SCHEMA) throw new Error(`${source} is not a Service Blueprint record`);
      return fromJsonRecord(rec, source);
    });
  }
  return fromCsv(text, source);
}

export function entryFromOpenRecord(state: RecordState, placement?: PlacementResponse): CompareEntry {
  return fromJsonRecord(exportRecord(state, placement), "Open record");
}

// Samples are full fictional records (answers included), so their combined export reads
// exactly like real customers' and reimports cleanly.
export function sampleEntries(): CompareEntry[] {
  return compare.samples.map((s) => {
    const [row, column] = s.claimed.split("__");
    const state: RecordState = {
      profile: { name: s.name, industry: s.industry, sector: s.sector, revenue: s.revenue, technicians: s.technicians, branches: s.branches, systems: s.systems, contact: "" },
      claimed: { row, column },
      answers: s.answers,
      questionNotes: {},
      notes: `${compare.sampleLabel}. ${s.notes}`,
    };
    return { ...fromJsonRecord(exportRecord(state, { cell: s.actual, rationale: "" }), compare.sampleLabel), sample: true };
  });
}

// Later loads of the same customer replace earlier ones, so re-adding a newer export updates it.
export function mergeEntries(current: CompareEntry[], incoming: CompareEntry[]): CompareEntry[] {
  const map = new Map(current.map((e) => [e.key, e]));
  for (const e of incoming) map.set(e.key, e);
  return [...map.values()];
}

export function combinedCsv(entries: CompareEntry[]): string {
  const rows = [CSV_HEADER, ...entries.flatMap((e) => e.csvRows)];
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

const listed = (name: string) => compare.industries.some((i) => i.name === name);
export const industryOf = (e: CompareEntry) => (listed(e.industry) ? e.industry : e.industry.trim() ? `${e.industry} (unlisted)` : "Not set");
