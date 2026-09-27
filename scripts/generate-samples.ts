// Generates the fictional sample customers in content/compare.json.
// Run with `npm run samples`. For each sample, it searches every intake answer combination
// through the Worker's scoring and keeps a clear-cut set that lands in the sample's "does"
// cell, so every sample record is internally consistent. Only answers are written to
// content; the scoring itself stays in the Worker.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { place, rubric } from "../worker/placement";

const root = join(import.meta.dirname, "..");
const comparePath = join(root, "content", "compare.json");
const intake = JSON.parse(readFileSync(join(root, "content", "intake.json"), "utf8"));

type Def = [name: string, industry: string, sector: string, revenue: string, technicians: string, branches: string, systems: string, says: string, does: string, note: string];

// says / does are cell ids: <row>__<column>
const defs: Def[] = [
  ["Meridian Industrial Equipment", "Industrials", "Manufacturing", "About $600M", "180", "14", "Legacy dispatch system, spreadsheets, separate warranty tool", "servitization__equipment", "profit-center__equipment", "Leadership talks uptime-as-a-service; operation runs time and materials."],
  ["Beacon Lift and Handling", "Industrials", "Manufacturing", "About $350M", "110", "8", "ERP service module, paper tickets", "profit-center__equipment", "cost-center__equipment", "Warranty work dominates; service margin is not reported."],
  ["Forgeline Compressor Systems", "Industrials", "Manufacturing", "About $480M", "140", "12", "Field service platform, ERP", "profit-center__equipment", "profit-center__equipment", "Contract attach tracked monthly; strong first-time fix culture."],
  ["Stonegate Packaging Machinery", "Industrials", "Manufacturing", "About $520M", "95", "6", "Remote monitoring, CRM, ERP", "servitization__outcome", "servitization__outcome", "Sells output guarantees backed by telemetry."],
  ["Granite Ridge Power Systems", "Industrials", "Energy", "About $1.2B", "150", "9", "Asset management system, spreadsheets", "servitization__outcome", "servitization__equipment", "Uptime contracts priced on labor; usage data not yet trusted."],
  ["Windcrest Turbine Services", "Industrials", "Energy", "About $900M", "220", "11", "SCADA feeds, field service platform", "servitization__outcome", "servitization__outcome", "Availability-based contracts with penalties and bonuses."],
  ["Solace Solar O&M", "Industrials", "Energy", "About $210M", "75", "5", "Monitoring portal, ticketing tool", "servitization__outcome", "profit-center__outcome", "Promises production guarantees without clean usage data."],
  ["Harborline Diagnostics", "Life Sciences", "MedTech", "About $900M", "240", "22", "Field service platform, CRM, ERP", "profit-center__equipment", "profit-center__equipment", "Service contracts priced per instrument; FTFR reviewed weekly."],
  ["Pulsepoint Surgical Systems", "Life Sciences", "MedTech", "About $650M", "130", "10", "CRM case management, remote support tool", "profit-center__equipment", "profit-center__knowledge", "Most fixes happen remotely by specialists; sees itself as a field shop."],
  ["Cellgate Lab Equipment", "Life Sciences", "Bio/Pharma", "About $300M", "60", "4", "ERP, spreadsheets", "profit-center__equipment", "cost-center__equipment", "Service given away to protect instrument sales."],
  ["Assaywell Instrument Services", "Life Sciences", "Life Science Services", "About $180M", "70", "7", "Field service platform, LIMS integration", "profit-center__knowledge", "profit-center__knowledge", "Application specialists billed by the hour."],
  ["Arrowway Imaging Services", "Healthcare", "Hospitals & Health Care Systems", "About $250M", "120", "16", "CMMS, email", "profit-center__knowledge", "cost-center__knowledge", "Biomed expertise provided free to affiliated hospitals."],
  ["Mercyline Clinical Engineering", "Healthcare", "Hospitals & Health Care Systems", "About $140M", "85", "9", "CMMS, spreadsheets", "cost-center__appointment", "cost-center__equipment", "Uptime obligations on imaging equipment funded as overhead."],
  ["Keystone Building Services", "Business & Professional Services", "Facility & Environmental", "About $400M", "95", "11", "Scheduling tool, accounting package", "profit-center__equipment", "profit-center__appointment", "Claims profit focus but prices cost-plus and measures utilization."],
  ["Clearwater Environmental Services", "Business & Professional Services", "Facility & Environmental", "About $220M", "160", "13", "Route planning tool, CRM", "cost-center__appointment", "cost-center__appointment", "Route density and cost per stop drive every decision."],
  ["Brightpath Facility Partners", "Business & Professional Services", "Facility & Environmental", "About $310M", "210", "15", "Work order system, spreadsheets", "profit-center__appointment", "cost-center__appointment", "Runs well on cost; leadership describes it as a margin business."],
  ["Crewline Technical Staffing", "Business & Professional Services", "Workforce Solutions", "About $160M", "300", "20", "Staffing platform, timesheets", "cost-center__appointment", "cost-center__appointment", "Placed technicians billed by the visit."],
  ["Pinecrest Inspection Partners", "Business & Professional Services", "Professional Services", "About $120M", "55", "6", "Inspection app, CRM", "profit-center__knowledge", "profit-center__knowledge", "Certified inspectors priced on expertise."],
  ["Summitline Mechanical", "Construction and Real Estate", "Construction", "About $300M", "310", "18", "Dispatch board, accounting package", "profit-center__appointment", "cost-center__appointment", "Service department exists to keep construction customers happy."],
  ["Ironbridge Elevator Co", "Construction and Real Estate", "Construction", "About $700M", "260", "19", "Field service platform, IoT gateways, ERP", "profit-center__equipment", "profit-center__equipment", "Maintenance contracts on every installed unit."],
  ["Tallgrass Fire Protection", "Construction and Real Estate", "Construction", "About $190M", "140", "10", "Inspection scheduling tool, spreadsheets", "profit-center__equipment", "cost-center__equipment", "Code inspections done at cost to win retrofit projects."],
  ["Harborview Property Services", "Construction and Real Estate", "Real Estate", "About $260M", "180", "12", "Property management system, work orders", "cost-center__appointment", "cost-center__appointment", "Tenant requests scheduled to a service window."],
  ["Oakmont Portfolio Maintenance", "Construction and Real Estate", "Real Estate", "About $150M", "90", "8", "Work order system, email", "servitization__outcome", "cost-center__appointment", "Pitches guaranteed building uptime; operates as a call-out crew."],
  ["Hearthline Appliance Service", "Consumer Products", "Consumer Goods", "About $230M", "350", "25", "Scheduling platform, parts portal", "cost-center__appointment", "cost-center__appointment", "In-home warranty visits booked to two-hour windows."],
  ["Cobaltwave Fitness Equipment", "Consumer Products", "Consumer Goods", "About $280M", "80", "7", "CRM, spreadsheets", "profit-center__equipment", "profit-center__appointment", "Service sold as a profit line but priced to cover cost."],
  ["Freshfield Beverage Systems", "Consumer Products", "Food & Beverage", "About $410M", "190", "17", "Field service platform, telemetry on dispensers", "profit-center__equipment", "profit-center__equipment", "Dispenser uptime contracts with parts coverage."],
  ["Grainhouse Foodservice Equipment", "Consumer Products", "Food & Beverage", "About $170M", "65", "6", "ERP, paper tickets", "profit-center__equipment", "cost-center__equipment", "Warranty repairs absorbed by the product business."],
  ["Copperpot Kitchen Services", "Consumer Products", "Retail & Restaurants", "About $130M", "120", "14", "Dispatch app, accounting package", "profit-center__equipment", "profit-center__appointment", "Restaurant call-outs billed at cost-plus with a margin target."],
  ["Vaultline ATM Services", "Financial Services", "Banking & Capital Markets", "About $340M", "210", "30", "Monitoring platform, ticketing tool", "servitization__outcome", "servitization__equipment", "Availability contracts priced per machine, not per outcome."],
  ["Claimwell Restoration Network", "Financial Services", "Insurance", "About $450M", "400", "35", "Claims platform, scheduling tool", "profit-center__appointment", "cost-center__appointment", "Carrier-directed jobs run to cost and cycle time."],
  ["Riverbend County Fleet Services", "Government Services", "State, Local, Government", "About $60M", "45", "3", "Fleet management system, spreadsheets", "cost-center__appointment", "cost-center__equipment", "Keeps the vehicle fleet running on a fixed budget."],
  ["Metro Transit Signal Maintenance", "Government Services", "State, Local, Government", "About $90M", "70", "4", "CMMS, radio dispatch", "cost-center__appointment", "cost-center__knowledge", "Specialist signal expertise with no internal chargeback."],
  ["Lakeshore University Facilities", "Nonprofit & Education", "Education", "About $110M", "150", "2", "CMMS, student portal requests", "cost-center__appointment", "cost-center__appointment", "Campus work orders scheduled by building and trade."],
  ["Commonroot Housing Repair", "Nonprofit & Education", "Nonprofit", "About $25M", "30", "3", "Spreadsheets, email", "cost-center__appointment", "cost-center__knowledge", "Skilled volunteers and staff give expertise away free."],
  ["Brightwire Networks", "Technology, Media & Telecom", "Technology", "About $700M", "85", "6", "Remote monitoring, CRM", "servitization__knowledge", "servitization__knowledge", "Managed-service subscriptions bundle expert support."],
  ["Datacrest Edge Services", "Technology, Media & Telecom", "Technology", "About $260M", "110", "9", "Field service platform, remote hands portal", "profit-center__knowledge", "profit-center__knowledge", "Remote hands and expert resolution billed per incident."],
  ["Signalpeak Broadband Field Ops", "Technology, Media & Telecom", "Media, Entertainment & Telecom", "About $800M", "900", "40", "Workforce management system, OSS/BSS", "profit-center__appointment", "profit-center__appointment", "Install and repair visits measured on cost per job despite a profit mandate."],
];

type Answers = Record<string, string>;
const questions: { id: string; options: { id: string }[]; meridianAnswer: string }[] = intake.questions;

function* combos(i = 0, acc: Answers = {}): Generator<Answers> {
  if (i === questions.length) {
    yield { ...acc };
    return;
  }
  for (const o of questions[i].options) {
    acc[questions[i].id] = o.id;
    yield* combos(i + 1, acc);
  }
}

// Clear-cut = the winning row and column beat the runners-up by the widest margin.
function margin(answers: Answers) {
  const row: Record<string, number> = {};
  const col: Record<string, number> = {};
  for (const [qid, opts] of Object.entries(rubric.signals)) {
    const s = opts[answers[qid]];
    for (const [k, v] of Object.entries(s.row ?? {})) row[k] = (row[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.column ?? {})) col[k] = (col[k] ?? 0) + v;
  }
  const gap = (t: Record<string, number>) => {
    const v = Object.values(t).sort((a, b) => b - a);
    return (v[0] ?? 0) - (v[1] ?? 0);
  };
  return gap(row) + gap(col);
}

const all = [...combos()];
const byCell = new Map<string, { answers: Answers; margin: number }[]>();
for (const a of all) {
  const cell = place(a).cell;
  byCell.set(cell, [...(byCell.get(cell) ?? []), { answers: a, margin: margin(a) }]);
}
for (const list of byCell.values()) list.sort((x, y) => y.margin - x.margin);

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const meridian = Object.fromEntries(questions.map((q) => [q.id, q.meridianAnswer]));

const samples = defs.map(([name, industry, sector, revenue, technicians, branches, systems, claimed, actual, notes]) => {
  let answers: Answers;
  if (name === "Meridian Industrial Equipment") answers = meridian;
  else {
    const list = byCell.get(actual);
    if (!list?.length) throw new Error(`No answer set places ${name} in ${actual}`);
    const top = list.slice(0, Math.min(25, list.length));
    answers = top[hash(name) % top.length].answers;
  }
  if (place(answers).cell !== actual) throw new Error(`${name}: answers do not place in ${actual}`);
  return { name, industry, sector, revenue, technicians, branches, systems, notes, claimed, actual, answers };
});

const compare = JSON.parse(readFileSync(comparePath, "utf8"));
compare.samples = samples;
writeFileSync(comparePath, JSON.stringify(compare, null, 2) + "\n");
console.log(`Wrote ${samples.length} sample customers to content/compare.json (${all.length} answer combinations searched).`);
