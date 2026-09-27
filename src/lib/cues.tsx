import { createContext, useContext } from "react";
import type { CueId } from "../../shared/schema";

// Guided Tour cues: one suggested next move at a time. "next" means the step is done
// and the Next button is the suggestion.
export type ActiveCue = CueId | "next" | null;

interface CueState {
  active: ActiveCue;
  complete: (id: CueId) => void;
}

export const CueContext = createContext<CueState>({ active: null, complete: () => {} });
export const useCues = () => useContext(CueContext);
export const cueRing = (active: ActiveCue, id: ActiveCue) => (active !== null && active === id ? "cue-ring" : "");
