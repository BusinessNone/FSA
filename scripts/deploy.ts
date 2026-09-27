// `npm run deploy` = build, then this script:
//   1. Ensures a Cloudflare Access application protects the route, restricted to an email
//      allowlist. This runs BEFORE the Worker is uploaded, so the route is never public.
//   2. Runs `wrangler deploy`, injecting the Access team domain and application audience so
//      the Worker also verifies the Access token on every request.
//
// Required environment (put them in .env.deploy.local or export them):
//   CLOUDFLARE_API_TOKEN    token with Workers Scripts Edit, Workers Routes/Custom Domains Edit,
//                           and Access: Apps and Policies Edit
//   ACCESS_ALLOWED_EMAILS   comma-separated allowlist, e.g. "ben@example.com,jesse@example.com"
// Optional:
//   CLOUDFLARE_ACCOUNT_ID   overrides account_id in wrangler.toml
//   ACCESS_SESSION_DURATION default "24h"
//   SKIP_ACCESS_SETUP=1     deploy without touching Access (only if you manage Access yourself)
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(import.meta.dirname, "..");

// Minimal .env loader for .env.deploy.local (never committed).
const envFile = join(root, ".env.deploy.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const toml = readFileSync(join(root, "wrangler.toml"), "utf8");
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? toml.match(/^account_id\s*=\s*"([^"]+)"/m)?.[1];
const hostname = toml.match(/pattern\s*=\s*"([^"]+)"/)?.[1];

function die(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!accountId || accountId.startsWith("REPLACE_")) die("Set account_id in wrangler.toml (or CLOUDFLARE_ACCOUNT_ID).");
if (!hostname) die("Set a route pattern in wrangler.toml.");

interface CfResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
}

async function cf<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json()) as CfResponse<T>;
  if (!data.success) die(`Cloudflare API ${method} ${path} failed: ${data.errors.map((e) => `${e.code} ${e.message}`).join("; ")}`);
  return data.result;
}

async function ensureAccess(): Promise<{ teamDomain: string; aud: string }> {
  if (!process.env.CLOUDFLARE_API_TOKEN) die("CLOUDFLARE_API_TOKEN is required so Access can be configured before deploy.");
  const emails = (process.env.ACCESS_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (!emails.length) die("ACCESS_ALLOWED_EMAILS is required (comma-separated allowlist).");

  const org = await cf<{ auth_domain: string }>("GET", "/access/organizations");
  if (!org?.auth_domain) die("Zero Trust is not set up on this account. Create a team in the Cloudflare Zero Trust dashboard first.");

  const app = {
    name: "Service Blueprint Demo",
    domain: hostname,
    type: "self_hosted",
    session_duration: process.env.ACCESS_SESSION_DURATION ?? "24h",
    app_launcher_visible: false,
    policies: [
      {
        name: "Allowlisted emails",
        decision: "allow",
        include: emails.map((email) => ({ email: { email } })),
      },
    ],
  };

  const apps = await cf<{ id: string; domain: string; aud: string }[]>("GET", "/access/apps?per_page=100");
  const existing = apps.find((a) => a.domain === hostname);
  const saved = existing
    ? await cf<{ aud: string }>("PUT", `/access/apps/${existing.id}`, app)
    : await cf<{ aud: string }>("POST", "/access/apps", app);

  console.log(`✔ Access ${existing ? "updated" : "created"} for ${hostname}: ${emails.length} allowlisted email(s).`);
  return { teamDomain: org.auth_domain, aud: saved.aud };
}

const args = ["wrangler", "deploy"];
if (process.env.SKIP_ACCESS_SETUP === "1") {
  console.warn("! SKIP_ACCESS_SETUP=1: not configuring Access. Make sure the route is protected in the Zero Trust dashboard.");
} else {
  const { teamDomain, aud } = await ensureAccess();
  args.push("--var", `ACCESS_TEAM_DOMAIN:${teamDomain}`, "--var", `ACCESS_AUD:${aud}`);
}

const run = spawnSync("npx", args, { cwd: root, stdio: "inherit", env: process.env });
process.exit(run.status ?? 1);
