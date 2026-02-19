import { estimateProgressLabel } from "./estimates.js";
import { parseOptionalNumber, sessionKeyFor } from "./utils.js";

function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sessionMetaText(row) {
  let finishLabel = "";
  if (row.finish) {
    finishLabel = " - expected finish";
  }
  return `${row.minutes} minutes planned${finishLabel}`;
}

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

function progressFormForToday(row, book, interactionHandlers) {
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

function baseSessionItem(row) {
  const item = document.createElement("article");
  item.className = "day-details-item";

  const head = document.createElement("strong");
  head.textContent = row.title || "Untitled";

  const meta = document.createElement("p");
  meta.className = "day-details-meta";
  meta.textContent = sessionMetaText(row);
  item.append(head, meta);
  return item;
}

export function dayMode(dateKey) {
  const today = todayDateKey();
  if (dateKey < today) {
    return "past";
  }
  if (dateKey > today) {
    return "future";
  }
  return "today";
}

export function rowsWithCompletedLast(rows, interactionHandlers) {
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

export function completedRows(rows, interactionHandlers) {
  return rows.filter((row) => {
    return Boolean(interactionHandlers.isSessionCompleted(sessionKeyFor(row)));
  });
}

export function buildPastSessionItem(row) {
  const item = baseSessionItem(row);
  const completed = document.createElement("p");
  completed.className = "day-details-meta";
  completed.textContent = "Completed";
  item.classList.add("is-complete");
  item.append(completed);
  return item;
}

export function buildFutureSessionItem(row, state, interactionHandlers) {
  const item = baseSessionItem(row);
  const estimate = document.createElement("p");
  estimate.className = "day-details-meta";
  estimate.textContent = estimateProgressLabel(row, state, interactionHandlers.getBookById);
  item.append(estimate);
  return item;
}

export function buildTodaySessionItem(row, interactionHandlers, rerenderDetails) {
  const item = baseSessionItem(row);
  const sessionKey = sessionKeyFor(row);

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
  item.append(completeLabel, progressFormForToday(row, book, interactionHandlers));
  return item;
}
