// Build-time content validation. Run with `npm run validate` (also runs before dev and build).
// Checks every /content file against its zod schema, then checks cross-references and that the
// Worker's placement rubric still lands the acceptance-criteria cells.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";
import {
  clientSchema,
  compareSchema,
  configSchema,
  contrastBlueprintSchema,
  deepBlueprintSchema,
  deviationsSchema,
  gridSchema,
  intakeSchema,
  payoffSchema,
} from "../shared/schema";
import { cellId } from "../shared/api";
import { place, rubric } from "../worker/placement";

const root = join(import.meta.dirname, "..");
const contentDir = join(root, "content");
const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

function load<T>(file: string, schema: ZodType<T>): T {
  const raw = JSON.parse(readFileSync(join(contentDir, file), "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) fail(`${file}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return raw as T;
  }
  return result.data;
}

const config = load("config.json", configSchema);
const clientContent = load("client.json", clientSchema);
const compare = load("compare.json", compareSchema);
const grid = load("grid.json", gridSchema);
const intake = load("intake.json", intakeSchema);
const deviations = load("deviations.json", deviationsSchema);
const payoff = load("payoff.json", payoffSchema);

// ---- grid ----
const rowIds = grid.rows.map((r) => r.id);
const colIds = grid.columns.map((c) => c.id);
const seen = new Set<string>();
for (const cell of grid.cells) {
  if (!rowIds.includes(cell.row)) fail(`grid.json: unknown row ${cell.row}`);
  if (!colIds.includes(cell.column)) fail(`grid.json: unknown column ${cell.column}`);
  const cid = cellId(cell.row, cell.column);
  if (seen.has(cid)) fail(`grid.json: duplicate cell ${cid}`);
  seen.add(cid);
}
const byDepth = (d: string) => grid.cells.filter((c) => c.depth === d);
if (byDepth("deep").length !== 1) fail("grid.json: exactly one cell must be deep");
if (byDepth("contrast").length !== 1) fail("grid.json: exactly one cell must be contrast");
const deepCell = byDepth("deep")[0];
const contrastCell = byDepth("contrast")[0];

// ---- blueprints ----
const blueprintFiles = readdirSync(contentDir).filter((f) => f.startsWith("blueprint-") && f.endsWith(".json"));
const deepFile = deepCell && `blueprint-${cellId(deepCell.row, deepCell.column)}.json`;
const contrastFile = contrastCell && `blueprint-${cellId(contrastCell.row, contrastCell.column)}.json`;
for (const f of blueprintFiles) {
  if (f !== deepFile && f !== contrastFile) fail(`${f}: no deep or contrast grid cell matches this blueprint file`);
}
if (deepFile && !blueprintFiles.includes(deepFile)) fail(`missing ${deepFile} for the deep cell`);
if (contrastFile && !blueprintFiles.includes(contrastFile)) fail(`missing ${contrastFile} for the contrast cell`);

if (deepFile && blueprintFiles.includes(deepFile)) {
  const bp = load(deepFile, deepBlueprintSchema);
  if (cellId(bp.cell.row, bp.cell.column) !== cellId(deepCell.row, deepCell.column)) fail(`${deepFile}: cell does not match file name`);
  const areas = new Set(bp.processAreas.map((a) => a.id));
  for (const j of bp.jobs) if (!areas.has(j.area)) fail(`${deepFile}: job ${j.id} has unknown area ${j.area}`);
  for (const q of bp.questionSet) if (!areas.has(q.area)) fail(`${deepFile}: question ${q.id} has unknown area ${q.area}`);
  for (const a of areas) if (!bp.questionSet.some((q) => q.area === a)) fail(`${deepFile}: area ${a} has no questions`);
  for (const t of [1, 2, 3]) if (!bp.jobs.some((j) => j.tier === t)) fail(`${deepFile}: tier ${t} has no jobs`);
  const ids = [...bp.jobs, ...bp.kpis, ...bp.questionSet].map((x) => x.id);
  if (new Set(ids).size !== ids.length) fail(`${deepFile}: duplicate ids`);
}
if (contrastFile && blueprintFiles.includes(contrastFile)) {
  const bp = load(contrastFile, contrastBlueprintSchema);
  if (cellId(bp.cell.row, bp.cell.column) !== cellId(contrastCell.row, contrastCell.column)) fail(`${contrastFile}: cell does not match file name`);
}

// ---- self-rating statements ----
for (const r of grid.rows) {
  for (const q of intake.claim.selfRating) if (!r.profile.says[q.id]) fail(`grid.json: row ${r.id} has no "${q.id}" self-rating statement`);
  for (const k of Object.keys(r.profile.says))
    if (!intake.claim.selfRating.some((q) => q.id === k)) fail(`grid.json: row ${r.id} has a statement for unknown self-rating question ${k}`);
}

// ---- intake ----
const questionIds = intake.questions.map((q) => q.id);
for (const q of intake.questions) {
  if (!q.options.some((o) => o.id === q.meridianAnswer)) fail(`intake.json: ${q.id} meridianAnswer is not an option`);
}
for (const p of intake.presets) {
  for (const q of intake.questions) {
    const a = p.answers[q.id];
    if (!a) fail(`intake.json: preset ${p.id} is missing ${q.id}`);
    else if (!q.options.some((o) => o.id === a)) fail(`intake.json: preset ${p.id} has unknown option ${a} for ${q.id}`);
  }
}

const validClaim = (c: { row: string; column: string }) => rowIds.includes(c.row) && colIds.includes(c.column);
if (!validClaim(intake.claim.meridian)) fail("intake.json: claim.meridian is not a grid cell");
for (const p of intake.presets) if (!validClaim(p.claimed)) fail(`intake.json: preset ${p.id} claimed is not a grid cell`);

// ---- compare ----
const sectorsOf = (industry: string) => compare.industries.find((i) => i.name === industry)?.sectors;
const checkIndustry = (where: string, industry: string, sector: string) => {
  const sectors = sectorsOf(industry);
  if (!sectors) fail(`${where}: industry "${industry}" is not in compare.industries`);
  else if (!sectors.includes(sector)) fail(`${where}: sector "${sector}" is not listed under ${industry}`);
};
checkIndustry("client.json record.profile", clientContent.record.profile.industry, clientContent.record.profile.sector);
for (const smp of compare.samples) {
  checkIndustry(`compare.json sample ${smp.name}`, smp.industry, smp.sector);
  for (const c of [smp.claimed, smp.actual]) if (!seen.has(c)) fail(`compare.json: sample ${smp.name} has unknown cell ${c}`);
  for (const q of intake.questions) {
    if (!q.options.some((o) => o.id === smp.answers[q.id])) fail(`compare.json: sample ${smp.name} has no valid answer for ${q.id}`);
  }
}
if (new Set(compare.samples.map((x) => x.name.toLowerCase())).size !== compare.samples.length) fail("compare.json: sample names must be unique");

// ---- deviations ----
for (const r of deviations.requests) {
  if (!config.crim.types.includes(r.crimType)) fail(`deviations.json: ${r.id} crimType "${r.crimType}" is not in config.crim.types`);
}
const levels = deviations.riskLevels;
for (let i = 1; i < levels.length; i++) {
  if (levels[i].upTo <= levels[i - 1].upTo) fail("deviations.json: riskLevels must be in ascending upTo order");
}

// ---- payoff ----
if (new Set(payoff.ladder.tiers.map((t) => t.rung)).size !== 3) fail("payoff.json: ladder rungs must be 1, 2, 3");

// ---- tour ----
for (const beat of [1, 2, 3, 4]) if (!config.tour.some((t) => t.beat === beat)) fail(`config.json: tour has no step for beat ${beat}`);
const cueIds = config.tour.flatMap((t) => t.cues?.map((c) => c.id) ?? []);
if (new Set(cueIds).size !== cueIds.length) fail("config.json: each cue id may appear on only one tour step");
if (!config.continueCue.includes("{title}")) fail("config.json: continueCue must contain {title}");

// ---- placement rubric (Worker only) ----
if (JSON.stringify([...rubric.rows].sort()) !== JSON.stringify([...rowIds].sort())) fail("placement-rubric.json: rows do not match grid rows");
if (JSON.stringify([...rubric.columns].sort()) !== JSON.stringify([...colIds].sort())) fail("placement-rubric.json: columns do not match grid columns");
for (const q of intake.questions) {
  const signals = rubric.signals[q.id];
  if (!signals) {
    fail(`placement-rubric.json: no signals for question ${q.id}`);
    continue;
  }
  for (const o of q.options) if (!signals[o.id]) fail(`placement-rubric.json: no signal for ${q.id} / ${o.id}`);
}
for (const qid of Object.keys(rubric.signals)) if (!questionIds.includes(qid)) fail(`placement-rubric.json: signals for unknown question ${qid}`);

if (errors.length === 0 && deepCell && contrastCell) {
  const depthOf = (cid: string) => grid.cells.find((c) => cellId(c.row, c.column) === cid)?.depth;
  const meridian = Object.fromEntries(intake.questions.map((q) => [q.id, q.meridianAnswer]));
  const result = place(meridian);
  if (depthOf(result.cell) !== "deep") fail(`placement: Meridian's default answers land ${result.cell}, not the deep cell`);
  const presetDepths = intake.presets.map((p) => depthOf(place(p.answers).cell));
  if (!presetDepths.includes("contrast")) fail("placement: no preset lands the contrast cell");
  if (!presetDepths.includes("coming")) fail("placement: no preset lands a coming cell");
  for (const smp of compare.samples) {
    const got = place(smp.answers).cell;
    if (got !== smp.actual) fail(`compare.json: sample ${smp.name} answers place in ${got}, not ${smp.actual}. Run npm run samples.`);
  }
}

if (errors.length) {
  console.error(`Content validation failed (${errors.length}):\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log("Content OK.");
