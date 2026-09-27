import { describe, expect, it } from "vitest";
import { exportRecord, importRecord, recordToCsv, defaultProfile, type RecordState } from "../src/lib/record";
import intake from "../content/intake.json";

const meridian = Object.fromEntries(intake.questions.map((q) => [q.id, q.meridianAnswer]));
const visit = intake.presets.find((p) => p.id === "visit-operator")!;

const sample: RecordState = {
  profile: { ...defaultProfile(), name: "Acme Service Co", revenue: "About $250M", systems: "Spreadsheets, \"legacy\" dispatch, ERP" },
  claimed: { row: "profit-center", column: "appointment" },
  answers: { ...visit.answers },
  questionNotes: { "ie-1": "Phone, email, and a portal.\nBranches re-key everything.", "sd-2": "Territory is a hard wall today" },
  notes: "Follow up with the service VP, next week",
};
const placement = { cell: "cost-center__appointment", rationale: "Service is run to protect the product sale." };

describe("customer record", () => {
  it("exports claimed vs actual with the gap", () => {
    const rec = exportRecord(sample, placement);
    expect(rec.claimed.cell).toBe("profit-center__appointment");
    expect(rec.actual?.cell).toBe("cost-center__appointment");
    expect(rec.gap).toBe(true);
    expect(rec.answers).toHaveLength(intake.questions.length);
    expect(rec.questionNotes.map((n) => n.id)).toEqual(["ie-1", "sd-2"]);
  });

  it("round-trips through JSON", () => {
    const text = JSON.stringify(exportRecord(sample, placement));
    const back = importRecord(text, { ...sample, answers: meridian, questionNotes: {}, notes: "" });
    expect(back.profile).toEqual(sample.profile);
    expect(back.claimed).toEqual(sample.claimed);
    expect(back.answers).toEqual(sample.answers);
    expect(back.questionNotes).toEqual(Object.fromEntries(Object.entries(sample.questionNotes).map(([k, v]) => [k, v.trim()])));
    expect(back.notes).toBe(sample.notes);
  });

  it("round-trips through CSV, including quotes, commas, and line breaks", () => {
    const csv = recordToCsv(exportRecord(sample, placement));
    expect(csv.split("\n")[0]).toBe("customer,section,field,value");
    const back = importRecord(csv, { ...sample, answers: meridian, questionNotes: {}, notes: "" });
    expect(back.profile).toEqual(sample.profile);
    expect(back.claimed).toEqual(sample.claimed);
    expect(back.answers).toEqual(sample.answers);
    expect(back.questionNotes["ie-1"]).toBe(sample.questionNotes["ie-1"]);
    expect(back.notes).toBe(sample.notes);
  });

  it("rejects files that are not records", () => {
    expect(() => importRecord('{"hello":1}', sample)).toThrow();
    expect(() => importRecord("a,b\n1,2\n", sample)).toThrow();
  });
});
