import { describe, expect, it } from "vitest";
import { place, PlacementError } from "../worker/placement";
import worker from "../worker/index";
import intake from "../content/intake.json";
import grid from "../content/grid.json";
import blueprint from "../content/blueprint-profit-center__equipment.json";
import { questionSetMarkdown } from "../src/lib/markdown";
import type { DeepBlueprint } from "../shared/schema";

const meridian = Object.fromEntries(intake.questions.map((q) => [q.id, q.meridianAnswer]));
const preset = (id: string) => intake.presets.find((p) => p.id === id)!.answers;
const depthOf = (cell: string) => grid.cells.find((c) => `${c.row}__${c.column}` === cell)?.depth;

describe("placement", () => {
  it("places Meridian's default answers in Profit Center × Equipment-Centric", () => {
    expect(place(meridian).cell).toBe("profit-center__equipment");
  });

  it("lands the contrast cell and a coming cell from edited answers", () => {
    expect(depthOf(place(preset("visit-operator")).cell)).toBe("contrast");
    expect(depthOf(place(preset("uptime-operator")).cell)).toBe("coming");
  });

  it("returns a two- or three-sentence rationale", () => {
    const sentences = place(meridian).rationale.split(/(?<=\.)\s+/);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(3);
  });

  it("rejects missing or unknown answers", () => {
    expect(() => place({})).toThrow(PlacementError);
    expect(() => place({ ...meridian, "job-mix": "nope" })).toThrow(PlacementError);
  });
});

describe("POST /api/place", () => {
  const env = { ASSETS: { fetch: async () => new Response("asset") } } as never;
  const call = (body: unknown) =>
    worker.fetch!(new Request("http://localhost/api/place", { method: "POST", body: JSON.stringify(body) }) as never, env, {} as never);

  it("responds with only { cell, rationale }", async () => {
    const res = await call({ answers: meridian });
    expect(res.status).toBe(200);
    expect(Object.keys(await res.json()).sort()).toEqual(["cell", "rationale"]);
  });

  it("returns 400 without leaking details on bad input", async () => {
    const res = await call({ answers: { "job-mix": "mostly-remote" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Incomplete or unknown answers" });
  });

  it("refuses non-local requests when Access is not configured", async () => {
    const res = await worker.fetch!(new Request("https://fsa.benvollmer.net/") as never, env, {} as never);
    expect(res.status).toBe(403);
  });

  it("refuses requests without an Access token when Access is configured", async () => {
    const guarded = { ...(env as object), ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" } as never;
    const res = await worker.fetch!(new Request("https://x/") as never, guarded, {} as never);
    expect(res.status).toBe(403);
  });
});

describe("question set export", () => {
  it("produces clean Markdown with every question and area", () => {
    const bp = blueprint as DeepBlueprint;
    const md = questionSetMarkdown(bp, "Meridian Industrial Equipment", "fictional client");
    expect(md.startsWith("# Question Set: Profit Center × Equipment-Centric\n")).toBe(true);
    for (const a of bp.processAreas) expect(md).toContain(`## ${a.label}\n`);
    expect(md.match(/^### \d+\. /gm)?.length).toBe(bp.questionSet.length);
    expect(md).not.toMatch(/\n{3,}/);
  });
});
