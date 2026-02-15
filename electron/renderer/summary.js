import { el } from "./dom.js";

export function renderSummary(summary, books) {
  const titleById = Object.fromEntries((books || []).map((b) => [b.book_id, b.title]));
  const lines = [
    `Planner: ${summary.planner} (${summary.status})`,
    `Planned minutes: ${summary.total_planned_minutes}`,
    `Available minutes: ${summary.total_available_minutes}`,
    `Required minutes: ${summary.total_required_minutes}`,
  ];
  if (summary.feasibility_warning) lines.push(`Warning: ${summary.feasibility_warning}`);
  Object.entries(summary.per_book).forEach(([id, info]) => {
    const title = titleById[id] || info.title;
    lines.push(`${title}: ${info.planned_words}/${info.words_total} (${info.finished ? "finished" : "incomplete"})`);
  });
  el("summary").textContent = lines.join("\n");
}
