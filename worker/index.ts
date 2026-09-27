import { place, PlacementError } from "./placement";
import { verifyAccessJwt } from "./access";
import type { PlacementRequest } from "../shared/api";

interface Env {
  ASSETS: Fetcher;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.ACCESS_AUD?.trim();
  if (!teamDomain || !audience) return true;
  const token =
    request.headers.get("cf-access-jwt-assertion") ??
    request.headers.get("cookie")?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  if (!token) return false;
  try {
    return await verifyAccessJwt(token, teamDomain, audience);
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    if (!(await isAuthorized(request, env))) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);
    if (url.pathname === "/api/place") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      let body: PlacementRequest;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (!body || typeof body.answers !== "object" || body.answers === null) {
        return json({ error: "Expected { answers }" }, 400);
      }
      try {
        const { cell, rationale } = place(body.answers);
        return json({ cell, rationale });
      } catch (err) {
        if (err instanceof PlacementError) return json({ error: "Incomplete or unknown answers" }, 400);
        throw err;
      }
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
