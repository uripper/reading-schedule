// @ts-nocheck
import { el } from "./dom.js";

const state = {
  dates: {},
  months: [],
  index: 0,
  selectedDate: "",
  monthCellKeys: [],
};
let interactionHandlers = {
  isSessionCompleted: () => false,
  onSessionCompletionChanged: () => {},
  onSessionProgressUpdated: () => null,
  getBookById: () => null,
};
const SESSION_INDEX_PAD = 3;
const CALENDAR_COLUMN_COUNT = 7;
const WEEK_START_OFFSET = 6;
const DAY_GRID_SIZE = 42;

function monthLabel(key) {
  if (!key) {
    return "No Schedule";
  }
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function enrichRows(rows, totals = {}) {
  const progress = {};
  return [...rows]
    .sort(
      (a, b) =>
        `${a.date}-${String(a.session_index).padStart(SESSION_INDEX_PAD, "0")}`.localeCompare(
          `${b.date}-${String(b.session_index).padStart(SESSION_INDEX_PAD, "0")}`,
        ),
    )
    .map((row) => {
      progress[row.book_id] = (progress[row.book_id] || 0) + Number(row.words_planned || 0);
      const done = (totals[row.book_id] || 0) > 0 && progress[row.book_id] >= totals[row.book_id];
      return { ...row, finish: done };
    });
}

function monthCells(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + WEEK_START_OFFSET) % CALENDAR_COLUMN_COUNT));
  return Array.from({ length: DAY_GRID_SIZE }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function dateHeading(dateKey) {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

function sessionKeyFor(row) {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

function parseOptionalNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function renderDetails() {
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

  rows.forEach((row) => {
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
    };

    const book = interactionHandlers.getBookById(row.book_id) || {};
    const progressForm = document.createElement("form");
    progressForm.className = "day-progress-form";

    const pagesInput = document.createElement("input");
    pagesInput.type = "number";
    pagesInput.min = "0";
    pagesInput.step = "1";
    pagesInput.placeholder = "Pages read";
    if (book.pages_read !== null && book.pages_read !== undefined) {
      pagesInput.value = String(book.pages_read);
    }

    const pctInput = document.createElement("input");
    pctInput.type = "number";
    pctInput.min = "0";
    pctInput.max = "100";
    pctInput.step = "0.1";
    pctInput.placeholder = "% complete";
    if (book.progress_percent !== null && book.progress_percent !== undefined) {
      pctInput.value = String(book.progress_percent);
    }

    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "btn";
    saveBtn.textContent = "Update Progress";

    progressForm.append(pagesInput, pctInput, saveBtn);
    progressForm.onsubmit = (event) => {
      event.preventDefault();
      const pagesRead = parseOptionalNumber(pagesInput.value);
      const progressPercent = parseOptionalNumber(pctInput.value);
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
      }
      if (updated && updated.progress_percent !== null && updated.progress_percent !== undefined) {
        pctInput.value = String(updated.progress_percent);
      }
    };

    item.append(head, meta, completeLabel, progressForm);
    list.append(item);
  });

  details.replaceChildren(title, list);
}

function selectDate(dateKey, options = {}) {
  state.selectedDate = dateKey;
  renderMonth();
  renderDetails();
  if (options.focus) {
    const button = document.querySelector(`[data-calendar-day='${dateKey}']`);
    if (button instanceof HTMLElement) {
      button.focus();
    }
  }
}

function moveSelectionBy(delta, currentIndex) {
  const nextIndex = Math.min(state.monthCellKeys.length - 1, Math.max(0, currentIndex + delta));
  const nextKey = state.monthCellKeys[nextIndex];
  if (!nextKey) {
    return;
  }
  selectDate(nextKey, { focus: true });
}

function renderMonth() {
  const key = state.months[state.index];
  const calendar = el("calendar");
  if (!key) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "No schedule yet.";
    calendar.replaceChildren(empty);
    state.monthCellKeys = [];
    renderDetails();
    return;
  }

  const [year, month] = key.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const cells = monthCells(key);
  state.monthCellKeys = cells.map((date) => dayKey(date));

  if (!state.selectedDate || !state.monthCellKeys.includes(state.selectedDate)) {
    const firstWithRows = state.monthCellKeys.find((cellKey) => (state.dates[cellKey] || []).length > 0);
    state.selectedDate = firstWithRows || state.monthCellKeys[0] || "";
  }

  const weekdayHeader = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => {
    const head = document.createElement("span");
    head.className = "calendar-weekday";
    head.textContent = label;
    return head;
  });

  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", `Schedule for ${monthLabel(key)}`);

  cells.forEach((date, index) => {
    const keyForDay = state.monthCellKeys[index];
    const rows = state.dates[keyForDay] || [];
    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "day";
    if (date.getMonth() !== first.getMonth()) {
      dayButton.className = "day is-muted";
    }
    if (state.selectedDate === keyForDay) {
      dayButton.classList.add("is-selected");
    }
    dayButton.dataset.calendarDay = keyForDay;
    dayButton.setAttribute("role", "gridcell");
    dayButton.setAttribute("aria-selected", "false");
    if (state.selectedDate === keyForDay) {
      dayButton.setAttribute("aria-selected", "true");
    }

    const dayDate = document.createElement("span");
    dayDate.className = "day-date";
    dayDate.textContent = String(date.getDate());

    const count = document.createElement("span");
    count.className = "day-event-count";
    count.textContent = "No sessions";
    if (rows.length) {
      count.textContent = `${rows.length} planned`;
    }

    dayButton.append(dayDate, count);

    rows.slice(0, 2).forEach((row) => {
      const chip = document.createElement("span");
      chip.className = "day-chip";
      if (row.finish) {
        chip.className = "day-chip finish";
      }
      chip.textContent = `${row.title} - ${row.minutes}m`;
      dayButton.append(chip);
    });

    if (rows.length > 2) {
      const extra = document.createElement("span");
      extra.className = "day-chip is-more";
      extra.textContent = `+${rows.length - 2} more`;
      dayButton.append(extra);
    }

    dayButton.onclick = () => selectDate(keyForDay);
    dayButton.onkeydown = (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSelectionBy(1, index);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelectionBy(-1, index);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelectionBy(CALENDAR_COLUMN_COUNT, index);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelectionBy(-CALENDAR_COLUMN_COUNT, index);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        moveSelectionBy(-index, index);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        moveSelectionBy(state.monthCellKeys.length - index - 1, index);
      }
    };

    grid.append(dayButton);
  });

  calendar.replaceChildren(...weekdayHeader, grid);
  renderDetails();
}

function renderControls() {
  const key = state.months[state.index] || "";
  const controls = el("calendarControls");
  const title = document.createElement("strong");
  title.textContent = monthLabel(key);

  if (!key) {
    controls.replaceChildren(title);
    return;
  }

  const prev = document.createElement("button");
  prev.className = "btn";
  prev.type = "button";
  prev.textContent = "Prev";

  const next = document.createElement("button");
  next.className = "btn";
  next.type = "button";
  next.textContent = "Next";

  prev.onclick = () => {
    state.index = Math.max(0, state.index - 1);
    renderControls();
    renderMonth();
  };

  next.onclick = () => {
    state.index = Math.min(state.months.length - 1, state.index + 1);
    renderControls();
    renderMonth();
  };

  controls.replaceChildren(prev, title, next);
}

export function firstPlannedRow(rows = []) {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  const sortedRows = [...rows].sort(
    (a, b) =>
      `${a.date}-${String(a.session_index).padStart(SESSION_INDEX_PAD, "0")}`.localeCompare(
        `${b.date}-${String(b.session_index).padStart(SESSION_INDEX_PAD, "0")}`,
      ),
  );
  return sortedRows[0] || null;
}

export function renderCalendar(rows, totals) {
  const enriched = enrichRows(rows, totals);
  state.dates = enriched.reduce((acc, row) => {
    acc[row.date] ||= [];
    acc[row.date].push(row);
    return acc;
  }, {});
  state.months = [...new Set(enriched.map((row) => row.date.slice(0, 7)))].sort();
  state.index = 0;
  state.selectedDate = "";

  renderControls();
  renderMonth();
}

export function configureCalendarInteractions(handlers = {}) {
  const resolve = (candidate, fallback) => {
    if (typeof candidate === "function") {
      return candidate;
    }
    return fallback;
  };
  interactionHandlers = {
    isSessionCompleted: resolve(handlers.isSessionCompleted, () => false),
    onSessionCompletionChanged: resolve(handlers.onSessionCompletionChanged, () => {}),
    onSessionProgressUpdated: resolve(handlers.onSessionProgressUpdated, () => null),
    getBookById: resolve(handlers.getBookById, () => null),
  };
}
