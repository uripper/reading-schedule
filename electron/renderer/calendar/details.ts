
import { el } from "../dom.js";
import { dateHeading, parseOptionalNumber, sessionKeyFor } from "./utils.js";

function setInputValueFromBookProgress(inputNode, value) {
  if (value !== null && value !== undefined) {
    inputNode.value = String(value);
  }
}

function changedNumberValue(inputNode, initialValue) {
  const currentValue = String(inputNode.value ?? "").trim();
  if (currentValue === String(initialValue)) {
    return null;
  }
  return parseOptionalNumber(currentValue);
}

function buildSessionProgressForm(row, book, interactionHandlers) {
  const progressForm = document.createElement("form");
  progressForm.className = "day-progress-form";

  const pagesInput = document.createElement("input");
  pagesInput.type = "number";
  pagesInput.min = "0";
  pagesInput.step = "1";
  pagesInput.placeholder = "Pages read";
  setInputValueFromBookProgress(pagesInput, book.pages_read);

  const pctInput = document.createElement("input");
  pctInput.type = "number";
  pctInput.min = "0";
  pctInput.max = "100";
  pctInput.step = "0.1";
  pctInput.placeholder = "Percent complete";
  setInputValueFromBookProgress(pctInput, book.progress_percent);

  const pagesLabel = document.createElement("label");
  pagesLabel.className = "day-progress-field";
  pagesLabel.textContent = "Pages Read";
  pagesLabel.append(pagesInput);

  const percentLabel = document.createElement("label");
  percentLabel.className = "day-progress-field";
  percentLabel.textContent = "Complete %";
  percentLabel.append(pctInput);

  let initialPagesValue = String(pagesInput.value ?? "").trim();
  let initialPercentValue = String(pctInput.value ?? "").trim();

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "btn";
  saveBtn.textContent = "Update Progress";

  progressForm.append(pagesLabel, percentLabel, saveBtn);
  progressForm.onsubmit = (event) => {
    event.preventDefault();
    const pagesRead = changedNumberValue(pagesInput, initialPagesValue);
    const progressPercent = changedNumberValue(pctInput, initialPercentValue);
    if (pagesRead === null && progressPercent === null) {
      return;
    }
    const updated = interactionHandlers.onSessionProgressUpdated({
      bookId: row.book_id,
      pagesRead,
      progressPercent,
      row,
    });
    if (updated && updated.pages_read !== null && updated.pages_read !== undefined) {
      pagesInput.value = String(updated.pages_read);
      initialPagesValue = String(pagesInput.value ?? "").trim();
    }
    if (updated && updated.progress_percent !== null && updated.progress_percent !== undefined) {
      pctInput.value = String(updated.progress_percent);
      initialPercentValue = String(pctInput.value ?? "").trim();
    }
  };

  return progressForm;
}

function buildSessionItem(row, interactionHandlers, rerenderDetails) {
  const item = document.createElement("article");
  item.className = "day-details-item";
  const sessionKey = sessionKeyFor(row);

  const head = document.createElement("strong");
  head.textContent = row.title || "Untitled";

  const meta = document.createElement("p");
  meta.className = "day-details-meta";
  let finishLabel = "";
  if (row.finish) {
    finishLabel = " - expected finish";
  }
  meta.textContent = `${row.minutes} minutes planned${finishLabel}`;

  const completeLabel = document.createElement("label");
  completeLabel.className = "day-complete-toggle";
  const completeInput = document.createElement("input");
  completeInput.type = "checkbox";
  completeInput.checked = Boolean(interactionHandlers.isSessionCompleted(sessionKey));
  completeLabel.append(completeInput, " Complete session");
  item.classList.toggle("is-complete", completeInput.checked);

  completeInput.onchange = () => {
    const checked = Boolean(completeInput.checked);
    item.classList.toggle("is-complete", checked);
    interactionHandlers.onSessionCompletionChanged({
      completed: checked,
      row,
      sessionKey,
    });
    rerenderDetails();
  };

  const book = interactionHandlers.getBookById(row.book_id) || {};
  const progressForm = buildSessionProgressForm(row, book, interactionHandlers);
  item.append(head, meta, completeLabel, progressForm);
  return item;
}

function rowsWithCompletedLast(rows, interactionHandlers) {
  const incompleteRows = [];
  const completedRows = [];
  rows.forEach((row) => {
    const complete = Boolean(interactionHandlers.isSessionCompleted(sessionKeyFor(row)));
    if (complete) {
      completedRows.push(row);
      return;
    }
    incompleteRows.push(row);
  });
  return [...incompleteRows, ...completedRows];
}

export function renderCalendarDetails(state, interactionHandlers) {
  const details = el("calendarDayDetails");
  const key = state.selectedDate;
  const rows = state.dates[key] || [];

  const title = document.createElement("h2");
  title.textContent = "Selected Day";
  if (key) {
    title.textContent = dateHeading(key);
  }

  if (!key) {
    const hint = document.createElement("p");
    hint.className = "hint-text";
    hint.textContent = "Select a day in the schedule grid to view details.";
    details.replaceChildren(title, hint);
    return;
  }

  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "No sessions planned for this day.";
    details.replaceChildren(title, empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "day-details-list";
  const rerenderDetails = () => {
    renderCalendarDetails(state, interactionHandlers);
  };
  rowsWithCompletedLast(rows, interactionHandlers).forEach((row) => {
    list.append(buildSessionItem(row, interactionHandlers, rerenderDetails));
  });

  details.replaceChildren(title, list);
}
