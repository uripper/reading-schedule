
import { HISTORY_LIMIT } from "./constants.js";
import { formatTimeRange } from "./utils.js";

export function renderSessionHistory(container: HTMLElement | null, sessions: string | any[], onDelete: { (sessionId: any): void; (sessionId: any): void; (sessionId: any): void; (sessionId: any): void; (arg0: any): any; }) {
  const rows = sessions.slice(0, HISTORY_LIMIT);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "No sessions logged yet.";
    container.replaceChildren(empty);
    return;
  }

  const cards = rows.map((session: { title: any; minutes: any; pages_read: null; started_at: any; ended_at: any; notes: any; source: string; id: string | undefined; }) => {
    const card = document.createElement("article");
    card.className = "session-entry";

    const title = document.createElement("strong");
    title.textContent = `${session.title} - ${session.minutes}m`;

    const meta = document.createElement("p");
    meta.className = "session-entry-meta";
    let pageText = "";
    if (session.pages_read !== null) {
      pageText = ` · ${session.pages_read} pages`;
    }
    meta.textContent = `${formatTimeRange(session.started_at, session.ended_at)}${pageText}`;

    const note = document.createElement("p");
    note.className = "session-entry-meta";
    let noteText = session.notes;
    if (!noteText) {
      noteText = "Timer entry";
      if (session.source === "manual") {
        noteText = "Manual entry";
      }
    }
    note.textContent = noteText;

    const actions = document.createElement("div");
    actions.className = "row";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn";
    removeBtn.dataset.sessionId = session.id;
    removeBtn.textContent = "Delete";
    removeBtn.onclick = () => onDelete(session.id);
    actions.append(removeBtn);

    card.append(title, meta, note, actions);
    return card;
  });

  container.replaceChildren(...cards);
}
