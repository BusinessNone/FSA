import type { DeepBlueprint } from "../../shared/schema";

// Exports the question set as clean Markdown an associate can paste into call notes.
export function questionSetMarkdown(bp: DeepBlueprint, clientName: string, fictionalNote: string, notes: Record<string, string> = {}): string {
  const out: string[] = [];
  out.push(`# Question Set: ${bp.title}`, "");
  out.push(`Client: ${clientName} (${fictionalNote})`, "");
  let n = 0;
  for (const area of bp.processAreas) {
    const questions = bp.questionSet.filter((q) => q.area === area.id);
    if (!questions.length) continue;
    out.push(`## ${area.label}`, "");
    for (const q of questions) {
      n += 1;
      out.push(`### ${n}. ${q.question}`, "");
      out.push(`**Why we ask:** ${q.whyWeAsk}`, "");
      out.push(`**What a good answer sounds like:** ${q.goodAnswer}`, "");
      out.push(`**Red-flag answers:**`, "");
      for (const rf of q.redFlags) out.push(`- ${rf.answer} Signals: ${rf.signals}`);
      out.push("");
      const note = notes[q.id]?.trim();
      if (note) out.push(`**Notes from the call:** ${note.replace(/\s*\n\s*/g, " ")}`, "");
    }
  }
  return out.join("\n").trimEnd() + "\n";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function downloadText(filename: string, text: string, type = "text/markdown;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
