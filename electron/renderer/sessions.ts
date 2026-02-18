// @ts-nocheck
import { uid } from "./dom.js";

const HISTORY_LIMIT = 30;

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (Number.isFinite(n)) {
    return Math.round(n);
  }
  return fallback;
}

function isoLocalDayKey(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const format = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Unknown time";
  return `${format.format(start)} - ${new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(end)}`;
}

function optionId(index) {
  return `session-book-option-${index}`;
}

function normalizeSession(session = {}) {
  const endedAtRaw = String(session.ended_at || session.endedAt || "").trim();
  const startedAtRaw = String(session.started_at || session.startedAt || "").trim();
  const endedAt = endedAtRaw || new Date().toISOString();
  const startedAt = startedAtRaw || endedAt;
  let pagesRead = null;
  if (session.pages_read !== null && session.pages_read !== undefined && session.pages_read !== "") {
    pagesRead = Math.max(0, toInt(session.pages_read, 0));
  }

  let source = "timer";
  if (session.source === "manual") {
    source = "manual";
  }

  return {
    id: String(session.id || uid()),
    book_id: String(session.book_id || ""),
    title: String(session.title || "Untitled"),
    started_at: startedAt,
    ended_at: endedAt,
    minutes: Math.max(1, toInt(session.minutes, 1)),
    pages_read: pagesRead,
    notes: String(session.notes || "").trim(),
    source,
    created_at: String(session.created_at || endedAt),
  };
}

function renderSessionHistory(container, sessions, onDelete) {
  const rows = sessions.slice(0, HISTORY_LIMIT);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "No sessions logged yet.";
    container.replaceChildren(empty);
    return;
  }

  const cards = rows.map((session) => {
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

function matchesQuery(book, query) {
  if (!query) return true;
  const search = query.toLowerCase();
  return [book.title, book.author].join(" ").toLowerCase().includes(search);
}

function clampIndex(index, length) {
  if (length <= 0) return -1;
  return ((index % length) + length) % length;
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function todayKey() {
  return isoLocalDayKey(new Date().toISOString());
}

function minutesForDay(sessions, dayKey) {
  return sessions
    .filter((session) => isoLocalDayKey(session.ended_at) === dayKey)
    .reduce((sum, session) => sum + Number(session.minutes || 0), 0);
}

function streakFromSessions(sessions) {
  const minuteMap = new Map();
  sessions.forEach((session) => {
    const key = isoLocalDayKey(session.ended_at);
    if (!key) return;
    minuteMap.set(key, (minuteMap.get(key) || 0) + Number(session.minutes || 0));
  });

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = isoLocalDayKey(cursor.toISOString());
    if ((minuteMap.get(key) || 0) <= 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function normalizeSessions(rawSessions = []) {
  let normalizedRawSessions = [];
  if (Array.isArray(rawSessions)) {
    normalizedRawSessions = rawSessions;
  }
  return normalizedRawSessions
    .map(normalizeSession)
    .sort((a, b) => String(b.ended_at).localeCompare(String(a.ended_at)));
}

export function initSessionsUI({
  getBooks,
  initialSessions,
  onSessionsChanged,
  announce,
  setStatus,
}) {
  const refs = {
    input: document.getElementById("sessionBookInput"),
    results: document.getElementById("sessionBookResults"),
    meta: document.getElementById("sessionBookMeta"),
    timerDisplay: document.getElementById("sessionTimerDisplay"),
    startBtn: document.getElementById("sessionStartBtn"),
    pauseBtn: document.getElementById("sessionPauseBtn"),
    stopBtn: document.getElementById("sessionStopBtn"),
    history: document.getElementById("sessionHistory"),
    manualMinutes: document.getElementById("manualMinutesInput"),
    manualPages: document.getElementById("manualPagesInput"),
    manualNotes: document.getElementById("manualNotesInput"),
    manualSaveBtn: document.getElementById("manualSessionBtn"),
  };

  let sessions = normalizeSessions(initialSessions);
  let filteredBooks = [];
  let pickerIndex = -1;
  let selectedBookId = "";

  let timerHandle = null;
  let timerStartedAt = null;
  let elapsedMs = 0;

  function selectedBook() {
    return getBooks().find((book) => book.book_id === selectedBookId) || null;
  }

  function selectBook(book) {
    if (!book) {
      selectedBookId = "";
      refs.input.value = "";
      refs.meta.textContent = "";
      return;
    }
    selectedBookId = book.book_id;
    refs.input.value = book.title;
    refs.meta.textContent = "Selected book";
    if (book.author) {
      refs.meta.textContent = `Selected: ${book.author}`;
    }
    hidePicker();
  }

  function renderPicker() {
    refs.results.innerHTML = "";
    if (!filteredBooks.length) {
      refs.results.classList.remove("has-items");
      refs.input.setAttribute("aria-expanded", "false");
      refs.input.removeAttribute("aria-activedescendant");
      return;
    }

    const items = filteredBooks.slice(0, 8).map((book, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "book-result book-result-inline";
      btn.dataset.bookId = book.book_id;
      btn.id = optionId(index);
      btn.setAttribute("role", "option");
      const active = pickerIndex === index;
      btn.classList.toggle("is-active", active);
      if (active) {
        btn.setAttribute("aria-selected", "true");
      } else {
        btn.setAttribute("aria-selected", "false");
      }

      const textWrap = document.createElement("span");
      const title = document.createElement("span");
      title.className = "book-result-title";
      title.textContent = book.title || "Untitled";

      const meta = document.createElement("span");
      meta.className = "book-result-meta";
      let dueLabel = "";
      if (book.deadline) {
        dueLabel = `Due ${book.deadline}`;
      }
      meta.textContent = [book.author || "", dueLabel].filter(Boolean).join(" · ");

      textWrap.append(title, meta);
      btn.append(textWrap);
      btn.onclick = () => selectBook(book);
      btn.onmousemove = () => {
        pickerIndex = index;
        renderPicker();
      };
      return btn;
    });

    refs.results.replaceChildren(...items);
    refs.results.classList.add("has-items");
    refs.input.setAttribute("aria-expanded", "true");
    if (pickerIndex >= 0) refs.input.setAttribute("aria-activedescendant", optionId(pickerIndex));
  }

  function hidePicker() {
    filteredBooks = [];
    pickerIndex = -1;
    renderPicker();
  }

  function refreshPicker() {
    const query = refs.input.value.trim().toLowerCase();
    filteredBooks = getBooks().filter((book) => matchesQuery(book, query));
    pickerIndex = -1;
    if (filteredBooks.length) {
      pickerIndex = 0;
    }
    renderPicker();
  }

  function timerRunning() {
    return timerStartedAt !== null;
  }

  function updateTimerLabel() {
    let runningMs = 0;
    if (timerRunning()) {
      runningMs = Date.now() - timerStartedAt;
    }
    const totalSeconds = Math.floor((elapsedMs + runningMs) / 1000);
    refs.timerDisplay.textContent = formatTimer(totalSeconds);
  }

  function syncTimerButtons() {
    const running = timerRunning();
    refs.startBtn.disabled = running;
    refs.pauseBtn.disabled = !running;
    refs.stopBtn.disabled = !running && elapsedMs <= 0;
  }

  function resetTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
    timerStartedAt = null;
    elapsedMs = 0;
    updateTimerLabel();
    syncTimerButtons();
  }

  function commitSession(sessionInput) {
    sessions = [normalizeSession(sessionInput), ...sessions]
      .sort((a, b) => String(b.ended_at).localeCompare(String(a.ended_at)));
    renderSessionHistory(refs.history, sessions, deleteSessionById);
    onSessionsChanged(sessions);
  }

  function stopAndPersistTimer() {
    const book = selectedBook();
    if (!book) {
      announce("Pick a book before stopping the timer.", "assertive");
      setStatus("Pick a book for this session.", true);
      return;
    }
    const now = Date.now();
    let totalMs = elapsedMs;
    if (timerRunning()) {
      totalMs += now - timerStartedAt;
    }
    if (totalMs < 1000) {
      announce("Session was too short to save.", "assertive");
      resetTimer();
      return;
    }

    const minutes = Math.max(1, Math.round(totalMs / 60000));
    const endedAt = new Date(now).toISOString();
    const startedAt = new Date(now - totalMs).toISOString();

    commitSession({
      id: uid(),
      book_id: book.book_id,
      title: book.title,
      started_at: startedAt,
      ended_at: endedAt,
      minutes,
      notes: "",
      source: "timer",
      created_at: endedAt,
    });

    announce(`Saved ${minutes} minute session for ${book.title}.`);
    setStatus("Session saved.");
    resetTimer();
  }

  function deleteSessionById(sessionId) {
    const session = sessions.find((row) => row.id === sessionId);
    if (!session) return;
    const confirmed = window.confirm(`Delete ${session.minutes} minute session for ${session.title}?`);
    if (!confirmed) return;
    sessions = sessions.filter((row) => row.id !== sessionId);
    renderSessionHistory(refs.history, sessions, deleteSessionById);
    onSessionsChanged(sessions);
    announce("Session deleted.");
  }

  function saveManualSession() {
    const minutes = Math.max(0, toInt(refs.manualMinutes.value, 0));
    if (minutes <= 0) {
      refs.manualMinutes.focus();
      setStatus("Manual session requires minutes.", true);
      announce("Minutes is required for manual session.", "assertive");
      return;
    }
    const book = selectedBook();
    if (!book) {
      refs.input.focus();
      setStatus("Pick a book before saving a session.", true);
      announce("Pick a book before saving a session.", "assertive");
      return;
    }

    const now = Date.now();
    const endedAt = new Date(now).toISOString();
    const startedAt = new Date(now - minutes * 60000).toISOString();
    const pages = refs.manualPages.value.trim();
    let pagesRead = null;
    if (pages) {
      pagesRead = Math.max(0, toInt(pages, 0));
    }

    commitSession({
      id: uid(),
      book_id: book.book_id,
      title: book.title,
      started_at: startedAt,
      ended_at: endedAt,
      minutes,
      pages_read: pagesRead,
      notes: refs.manualNotes.value.trim(),
      source: "manual",
      created_at: endedAt,
    });

    refs.manualMinutes.value = "";
    refs.manualPages.value = "";
    refs.manualNotes.value = "";
    announce(`Saved manual ${minutes} minute session.`);
    setStatus("Manual session saved.");
  }

  refs.input.addEventListener("input", refreshPicker);
  refs.input.addEventListener("focus", refreshPicker);
  refs.input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      if (!filteredBooks.length) refreshPicker();
      if (!filteredBooks.length) return;
      event.preventDefault();
      pickerIndex = clampIndex(pickerIndex + 1, filteredBooks.length);
      renderPicker();
      return;
    }
    if (event.key === "ArrowUp") {
      if (!filteredBooks.length) return;
      event.preventDefault();
      pickerIndex = clampIndex(pickerIndex - 1, filteredBooks.length);
      renderPicker();
      return;
    }
    if (event.key === "Enter") {
      if (pickerIndex < 0 || !filteredBooks.length) return;
      event.preventDefault();
      selectBook(filteredBooks[pickerIndex]);
      return;
    }
    if (event.key === "Escape") {
      hidePicker();
      refs.input.blur();
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (event.target === refs.input || refs.results.contains(event.target)) return;
    hidePicker();
  });

  refs.startBtn.onclick = () => {
    if (!selectedBook()) {
      announce("Pick a book before starting a session.", "assertive");
      refs.input.focus();
      return;
    }
    if (timerRunning()) return;
    timerStartedAt = Date.now();
    timerHandle = setInterval(updateTimerLabel, 1000);
    updateTimerLabel();
    syncTimerButtons();
    setStatus("Session started.");
    announce("Session started.");
  };

  refs.pauseBtn.onclick = () => {
    if (!timerRunning()) return;
    elapsedMs += Date.now() - timerStartedAt;
    timerStartedAt = null;
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
    updateTimerLabel();
    syncTimerButtons();
    setStatus("Session paused.");
    announce("Session paused.");
  };

  refs.stopBtn.onclick = stopAndPersistTimer;
  refs.manualSaveBtn.onclick = saveManualSession;

  renderSessionHistory(refs.history, sessions, deleteSessionById);
  updateTimerLabel();
  syncTimerButtons();

  return {
    getSessions: () => [...sessions],
    setSessions(nextSessions) {
      sessions = normalizeSessions(nextSessions);
      renderSessionHistory(refs.history, sessions, deleteSessionById);
    },
    refreshBooks: refreshPicker,
    selectBookById(bookId) {
      const book = getBooks().find((row) => row.book_id === bookId) || null;
      if (book) selectBook(book);
    },
    startTimer() {
      refs.startBtn.click();
    },
    todayMinutes() {
      return minutesForDay(sessions, todayKey());
    },
    streakDays() {
      return streakFromSessions(sessions);
    },
  };
}
