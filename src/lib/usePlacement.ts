import { useEffect, useRef, useState } from "react";
import type { Answers, PlacementResponse } from "../../shared/api";

export type PlacementState =
  | { status: "loading"; result?: PlacementResponse }
  | { status: "ready"; result: PlacementResponse }
  | { status: "error"; result?: PlacementResponse };

// Posts the intake answers to the Worker and returns only { cell, rationale }.
export function usePlacement(answers: Answers): PlacementState {
  const [state, setState] = useState<PlacementState>({ status: "loading" });
  const cache = useRef(new Map<string, PlacementResponse>());
  const key = JSON.stringify(answers);

  useEffect(() => {
    const hit = cache.current.get(key);
    if (hit) {
      setState({ status: "ready", result: hit });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ status: "loading", result: s.result }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/place", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers: JSON.parse(key) }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as PlacementResponse;
        cache.current.set(key, { cell: data.cell, rationale: data.rationale });
        setState({ status: "ready", result: data });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((s) => ({ status: "error", result: s.result }));
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  return state;
}
