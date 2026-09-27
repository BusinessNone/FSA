// Content schemas. Every file in /content is validated against these at build time
// (scripts/validate-content.ts), and the app's TypeScript types are inferred from them.
import { z } from "zod";

const id = z.string().regex(/^[a-z0-9-]+$/, "ids are lowercase kebab-case");
const text = z.string().min(1);

// ---------- config.json ----------
// Guided Tour cues are tied to specific controls in the app, so their ids are fixed.
export const cueIdSchema = z.enum([
  "try-contrast",
  "try-coming",
  "return-meridian",
  "compare-kpis",
  "copy-questions",
  "ask-why",
  "accept-all",
]);

export const configSchema = z.object({
  appTitle: text,
  appSubtitle: text,
  practiceScope: text,
  nextGrid: text,
  crim: z.object({
    acronym: text,
    expansion: text,
    types: z.array(text).min(1),
  }),
  illustrativeLabel: text,
  continueCue: text,
  vocabulary: z.array(z.object({ term: text, meaning: text })).min(1),
  tour: z
    .array(
      z.object({
        id,
        beat: z.number().int().min(1).max(4),
        beatLabel: text,
        title: text,
        talkTrack: text,
        blueprintTab: z.enum(["jobs", "kpis", "questions", "process"]).optional(),
        cues: z.array(z.object({ id: cueIdSchema, text: text })).optional(),
      }),
    )
    .min(4),
});

// ---------- client.json ----------
export const clientSchema = z.object({
  name: text,
  shortName: text,
  fictionalBadge: text,
  figuresNote: text,
  descriptor: text,
  profile: z.array(z.object({ label: text, value: text })).min(1),
  today: text,
  ambition: text,
  painPoints: z.array(text).min(1),
});

// ---------- grid.json ----------
export const depthSchema = z.enum(["deep", "contrast", "coming"]);

export const coherenceSchema = z.enum(["aligned", "transitional", "incoherent", "trap"]);

export const gridSchema = z.object({
  title: text,
  thesis: text,
  howToRead: text,
  rowAxisLabel: text,
  columnAxisLabel: text,
  columnSource: text,
  rows: z.array(z.object({ id, label: text, description: text })).length(3),
  columns: z.array(z.object({ id, label: text, description: text })).length(4),
  cells: z
    .array(
      z.object({
        row: id,
        column: id,
        depth: depthSchema,
        oneLiner: text,
        coherence: coherenceSchema,
        signal: text,
      }),
    )
    .length(12),
  comingLabel: text,
  coherence: z.array(z.object({ id: coherenceSchema, label: text, description: text })).length(4),
});

// ---------- intake.json ----------
export const intakeSchema = z.object({
  intro: text,
  questions: z
    .array(
      z.object({
        id,
        prompt: text,
        options: z.array(z.object({ id, label: text })).min(2),
        meridianAnswer: id,
      }),
    )
    .min(6)
    .max(8),
  presets: z
    .array(z.object({ id, label: text, answers: z.record(z.string(), id) }))
    .min(1),
});

// ---------- blueprint-*.json ----------
export const processAreaSchema = z.object({ id, label: text });

const kpiSchema = z.object({
  id,
  name: text,
  definition: text,
  whyItMatters: text,
  direction: z.enum(["higher", "lower"]),
  whatGoodLooksLike: text,
});

export const deepBlueprintSchema = z.object({
  cell: z.object({ row: id, column: id }),
  title: text,
  summary: text,
  tiers: z.array(z.object({ tier: z.number().int(), label: text, description: text })).length(3),
  jobs: z
    .array(
      z.object({
        id,
        tier: z.number().int().min(1).max(3),
        title: text,
        detail: text,
        area: id,
      }),
    )
    .min(10)
    .max(15),
  kpis: z.array(kpiSchema).min(6).max(8),
  processAreas: z.array(processAreaSchema).length(6),
  questionSet: z
    .array(
      z.object({
        id,
        area: id,
        question: text,
        whyWeAsk: text,
        goodAnswer: text,
        redFlags: z.array(z.object({ answer: text, signals: text })).min(1),
      }),
    )
    .min(12),
  process: z.object({
    label: text,
    note: text,
    steps: z
      .array(
        z.object({
          id,
          name: text,
          description: text,
          guardrail: text,
        }),
      )
      .min(6),
  }),
});

export const contrastBlueprintSchema = z.object({
  cell: z.object({ row: id, column: id }),
  title: text,
  summary: text,
  contrastLine: text,
  focusJobs: z.array(text).min(3).max(5),
  kpis: z.array(kpiSchema).min(3).max(4),
});

// ---------- deviations.json ----------
export const effortSchema = z.enum(["Low", "Med", "High"]);

export const deviationsSchema = z.object({
  intro: text,
  punchline: text,
  effortUnits: z.object({ Low: z.number().int().min(1), Med: z.number().int().min(1), High: z.number().int().min(1) }),
  riskLevels: z
    .array(z.object({ label: text, upTo: z.number().int().min(0), description: text }))
    .min(3),
  requests: z
    .array(
      z.object({
        id,
        request: text,
        context: text,
        blueprintAlternative: text,
        crimType: text,
        effort: effortSchema,
        ongoingBurden: z.array(z.enum(["Upgrade", "Test", "Support"])).min(1),
        ongoingDetail: text,
        askWhy: z.array(text).min(2).max(4),
      }),
    )
    .min(5)
    .max(6),
});

// ---------- payoff.json ----------
export const payoffSchema = z.object({
  intro: text,
  sides: z.object({ blankPage: text, blueprint: text }),
  comparison: z
    .array(z.object({ id, dimension: text, blankPage: text, blueprint: text }))
    .length(3),
  staffing: z.object({
    label: text,
    note: text,
    levels: z
      .array(
        z.object({
          role: text,
          blankPage: z.number().min(0).max(1),
          blueprint: z.number().min(0).max(1),
        }),
      )
      .min(3),
  }),
  reference: z.object({ label: text, text: text }),
  ladder: z.object({
    title: text,
    tiers: z
      .array(
        z.object({
          id,
          rung: z.number().int().min(1).max(3),
          title: text,
          description: text,
          depth: depthSchema,
        }),
      )
      .length(3),
  }),
  close: text,
});

export type Config = z.infer<typeof configSchema>;
export type CueId = z.infer<typeof cueIdSchema>;
export type Client = z.infer<typeof clientSchema>;
export type Grid = z.infer<typeof gridSchema>;
export type Depth = z.infer<typeof depthSchema>;
export type Coherence = z.infer<typeof coherenceSchema>;
export type Intake = z.infer<typeof intakeSchema>;
export type DeepBlueprint = z.infer<typeof deepBlueprintSchema>;
export type ContrastBlueprint = z.infer<typeof contrastBlueprintSchema>;
export type Kpi = z.infer<typeof kpiSchema>;
export type Deviations = z.infer<typeof deviationsSchema>;
export type DeviationRequest = Deviations["requests"][number];
export type Effort = z.infer<typeof effortSchema>;
export type Payoff = z.infer<typeof payoffSchema>;
