// Post-build guard for acceptance criterion 3: nothing from the placement rubric may ship
// to the browser. Fails the build if any rubric text or structure appears in dist/client,
// or if any client source file imports from /worker.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { rubric } from "../worker/placement";

const root = join(import.meta.dirname, "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const needles = new Set<string>([
  "closeCallRatio",
  "placement-rubric",
  ...Object.values(rubric.rationale.row),
  ...Object.values(rubric.rationale.column),
  rubric.rationale.closeCall.row.split("{label}")[1].trim(),
  rubric.rationale.closeCall.column.split("{label}")[1].trim(),
]);
// Any option id immediately followed by a weight object is rubric structure.
const structure = /"[a-z0-9-]+"\s*:\s*\{\s*"?(row|column)"?\s*:\s*\{/;

const problems: string[] = [];
const clientDir = join(root, "dist", "client");
for (const file of walk(clientDir)) {
  if (!/\.(js|css|html|json|map|txt)$/.test(file)) continue;
  const body = readFileSync(file, "utf8");
  for (const n of needles) if (body.includes(n)) problems.push(`${relative(root, file)} contains rubric text: "${n.slice(0, 60)}"`);
  if (structure.test(body)) problems.push(`${relative(root, file)} contains rubric-shaped weight data`);
  if (file.endsWith(".map")) problems.push(`${relative(root, file)}: source maps must not ship`);
}
for (const file of walk(join(root, "src"))) {
  if (/from\s+["'][./]*\/?worker\//.test(readFileSync(file, "utf8"))) problems.push(`${relative(root, file)} imports from /worker`);
}

if (problems.length) {
  console.error(`Rubric leak check failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log("Rubric leak check OK: dist/client carries no scoring data.");
