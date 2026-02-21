import { uid } from "../dom.js";
import { MS_PER_MINUTE, MS_PER_SECOND, SESSION_MIN_MS } from "./constants.js";
import type { Session } from "./normalize.js";
import type { SessionRefs } from "./refs.js";
import { formatTimer } from "./utils.js";

type SessionBook = {
  book_id: string;
  title: string;
};

type CommitSession = (
  sessionInput: Omit<Partial<Session>, "source" | "pages_read"> & {
    endedAt?: string;
    startedAt?: string;
    pages_read?: number | string | null;
    source?: string;
  },
) => void;

type Announce = (message: string, politeness?: string) => void;
type SetStatus = (message: string, isError?: boolean) => void;

export function createTimerController(
  refs: SessionRefs,
  selectedBook: () => SessionBook | null,
  commitSession: CommitSession,
  announce: Announce,
  setStatus: SetStatus,
) {
  let timerHandle: ReturnType<typeof setInterval> | null = null;
  let timerStartedAt: number | null = null;
  let elapsedMs = 0;

  const timerRunning = (): boolean => {
    return timerStartedAt !== null;
  };

  const updateTimerLabel = (): void => {
    let runningMs = 0;
    if (timerRunning() && timerStartedAt !== null) {
      runningMs = Date.now() - timerStartedAt;
    }
    const totalSeconds = Math.floor((elapsedMs + runningMs) / MS_PER_SECOND);
    refs.timerDisplay.textContent = formatTimer(totalSeconds);
  };

  const syncTimerButtons = (): void => {
    const running = timerRunning();
    refs.startBtn.disabled = running;
    refs.pauseBtn.disabled = !running;
    refs.stopBtn.disabled = !running && elapsedMs <= 0;
  };

  const resetTimer = (): void => {
    if (timerHandle !== null) {
      clearInterval(timerHandle);
    }
    timerHandle = null;
    timerStartedAt = null;
    elapsedMs = 0;
    updateTimerLabel();
    syncTimerButtons();
  };

  const stopAndPersistTimer = (): void => {
    const book = selectedBook();
    if (!book) {
      announce("Pick a book before stopping the timer.", "assertive");
      setStatus("Pick a book for this session.", true);
      return;
    }

    const now = Date.now();
    let totalMs = elapsedMs;
    if (timerRunning() && timerStartedAt !== null) {
      totalMs += now - timerStartedAt;
    }
    if (totalMs < SESSION_MIN_MS) {
      announce("Session was too short to save.", "assertive");
      resetTimer();
      return;
    }

    const minutes = Math.max(1, Math.round(totalMs / MS_PER_MINUTE));
    const endedAt = new Date(now).toISOString();
    const startedAt = new Date(now - totalMs).toISOString();

    commitSession({
      minutes,
      id: uid(),
      book_id: book.book_id,
      title: book.title,
      started_at: startedAt,
      ended_at: endedAt,
      notes: "",
      source: "timer",
      created_at: endedAt,
    });

    announce(`Saved ${minutes} minute session for ${book.title}.`);
    setStatus("Session saved.");
    resetTimer();
  };

  const startTimer = (): void => {
    if (!selectedBook()) {
      announce("Pick a book before starting a session.", "assertive");
      refs.input.focus();
      return;
    }
    if (timerRunning()) {
      return;
    }

    timerStartedAt = Date.now();
    timerHandle = setInterval(updateTimerLabel, MS_PER_SECOND);
    updateTimerLabel();
    syncTimerButtons();
    setStatus("Session started.");
    announce("Session started.");
  };

  const pauseTimer = (): void => {
    if (!timerRunning() || timerStartedAt === null) {
      return;
    }
    elapsedMs += Date.now() - timerStartedAt;
    timerStartedAt = null;
    if (timerHandle !== null) {
      clearInterval(timerHandle);
    }
    timerHandle = null;
    updateTimerLabel();
    syncTimerButtons();
    setStatus("Session paused.");
    announce("Session paused.");
  };

  return {
    updateTimerLabel,
    syncTimerButtons,
    startTimer,
    pauseTimer,
    stopAndPersistTimer,
  };
}
