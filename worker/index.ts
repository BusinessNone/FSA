import { place, PlacementError } from "./placement";
import type { PlacementRequest } from "../shared/api";

interface Env {
  ASSETS: Fetcher;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default {
  async fetch(request, env): Promise<Response> {
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
