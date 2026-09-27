import { describe, expect, it } from "vitest";
import { cellById } from "../src/content";
import { combinedCsv, entryFromOpenRecord, industryOf, maturityOf, mergeEntries, parseRecordFile, sampleEntries } from "../src/lib/compare";
import { defaultProfile, exportRecord, recordToCsv, type RecordState } from "../src/lib/record";
import intake from "../content/intake.json";
import compare from "../content/compare.json";

const visit = intake.presets.find((p) => p.id === "visit-operator")!;
const record = (name: string, industry: string, sector: string): RecordState => ({
  profile: { ...defaultProfile(), name, industry, sector },
  claimed: { row: "profit-center", column: "appointment" },
  answers: { ...visit.answers },
  questionNotes: {},
  notes: "",
});
const placement = { cell: "cost-center__appointment", rationale: "r" };

describe("maturity", () => {
  it("reads maturity from the TOM cell and the says/does gap", () => {
    const c = (id: string) => cellById(id);
    expect(maturityOf(c("profit-center__equipment"), c("profit-center__equipment"))).toBe("coherent");
    expect(maturityOf(c("servitization__equipment"), c("profit-center__equipment"))).toBe("misread");
    expect(maturityOf(c("profit-center__equipment"), c("cost-center__equipment"))).toBe("transitional");
    expect(maturityOf(c("profit-center__equipment"), c("profit-center__appointment"))).toBe("trap");
    expect(maturityOf(c("profit-center__knowledge"), c("cost-center__knowledge"))).toBe("incoherent");
    expect(maturityOf(c("profit-center__knowledge"), undefined)).toBeUndefined();
  });

  it("samples cover every maturity level", () => {
    const levels = new Set(sampleEntries().map((e) => e.maturity));
    for (const m of compare.maturity) expect(levels.has(m.id as never)).toBe(true);
  });
});

describe("loading records to compare", () => {
  it("reads every customer from a combined CSV and round-trips it", () => {
    const a = entryFromOpenRecord(record("Acme", "Industrials", "Energy"), placement);
    const b = entryFromOpenRecord(record("Bolt, Inc.", "Healthcare", "Hospitals & Health Care Systems"), placement);
    const csv = combinedCsv([a, b]);
    const back = parseRecordFile(csv, "combined.csv");
    expect(back.map((e) => e.name)).toEqual(["Acme", "Bolt, Inc."]);
    expect(back[1].sector).toBe("Hospitals & Health Care Systems");
    expect(back[0].maturity).toBe("misread");
    expect(combinedCsv(back)).toBe(csv);
  });

  it("reads a single JSON record and a JSON array", () => {
    const rec = exportRecord(record("Acme", "Industrials", "Energy"), placement);
    expect(parseRecordFile(JSON.stringify(rec), "a.json")[0].actual?.id).toBe("cost-center__appointment");
    expect(parseRecordFile(JSON.stringify([rec, { ...rec, profile: { ...rec.profile, name: "Zed" } }]), "all.json")).toHaveLength(2);
    expect(parseRecordFile(recordToCsv(rec), "a.csv")[0].claimed?.id).toBe("profit-center__appointment");
  });

  it("replaces an earlier load of the same customer", () => {
    const old = entryFromOpenRecord(record("Acme", "Industrials", "Energy"), placement);
    const newer = entryFromOpenRecord(record("acme ", "Industrials", "Manufacturing"), placement);
    const merged = mergeEntries([old], [newer]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sector).toBe("Manufacturing");
  });

  it("flags industries outside the FY27 list", () => {
    const e = entryFromOpenRecord(record("Acme", "Aerospace", ""), placement);
    expect(industryOf(e)).toBe("Aerospace (unlisted)");
  });

  it("rejects files that are not records", () => {
    expect(() => parseRecordFile('{"a":1}', "x.json")).toThrow();
    expect(() => parseRecordFile("a,b\n1,2\n", "x.csv")).toThrow();
  });
});

describe("sample customers", () => {
  it("are full records that reimport with their answers and facts", async () => {
    const { importRecord } = await import("../src/lib/record");
    for (const e of sampleEntries()) {
      const csv = combinedCsv([e]);
      const back = importRecord(csv, { profile: { ...defaultProfile() }, claimed: { row: "cost-center", column: "appointment" }, answers: {}, questionNotes: {}, notes: "" });
      const sample = compare.samples.find((s) => s.name === e.name)!;
      expect(back.profile.name).toBe(sample.name);
      expect(back.profile.sector).toBe(sample.sector);
      expect(back.answers).toEqual(sample.answers);
      expect(`${back.claimed.row}__${back.claimed.column}`).toBe(sample.claimed);
      expect(e.actual?.id).toBe(sample.actual);
    }
  });

  it("span every FY27 industry", () => {
    const used = new Set(compare.samples.map((s) => s.industry));
    for (const i of compare.industries) expect(used.has(i.name)).toBe(true);
  });
});

describe("industry roll-up", async () => {
  const { rollUp } = await import("../src/lib/compare");
  it("shares sum to the whole and aligned share counts coherent plus misread", () => {
    const rows = rollUp(sampleEntries(), compare.industries.map((i) => i.name));
    const all = rows[0];
    expect(all.label).toBe("All customers");
    expect(all.total).toBe(compare.samples.length);
    expect(all.counts.reduce((s, c) => s + c.n, 0)).toBe(all.total);
    for (const r of rows) {
      const sum = r.counts.reduce((s, c) => s + c.share, 0);
      expect(sum).toBeGreaterThanOrEqual(98);
      expect(sum).toBeLessThanOrEqual(102);
    }
    const ind = rows.find((r) => r.label === "Industrials")!;
    const aligned = ind.counts.filter((c) => c.maturity === "coherent" || c.maturity === "misread").reduce((s, c) => s + c.n, 0);
    expect(ind.alignedShare).toBe(Math.round((aligned / ind.total) * 100));
  });
});
