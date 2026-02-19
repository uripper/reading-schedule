
import { renderSessionHistory } from "./sessions/history.js";
import { createManualSessionSaver } from "./sessions/manual.js";
import { normalizeSession, normalizeSessions, Session } from "./sessions/normalize.js";
import { createPickerController } from "./sessions/picker.js";
import { createSessionRefs } from "./sessions/refs.js";
import { createTimerController } from "./sessions/timer.js";
import { minutesForDay, streakFromSessions, todayKey } from "./sessions/utils.js";

type InitSessionsUIArgs = {
  getBooks: Parameters<typeof createPickerController>[1];
  initialSessions: Parameters<typeof normalizeSessions>[0];
  onSessionsChanged: (sessions: Session[]) => void;
  announce: Parameters<typeof createTimerController>[3]; //NOSONAR (this isn't a magic number)
  setStatus: Parameters<typeof createTimerController>[4];
};


export function initSessionsUI({
  getBooks,
  initialSessions,
  onSessionsChanged,
  announce,
  setStatus,
}: InitSessionsUIArgs) {
  const refs = createSessionRefs();
  let sessions = normalizeSessions(initialSessions);

  const commitSession = (
    sessionInput: (
      Omit<Partial<Session>, "source" | "pages_read"> & {
        endedAt?: string; startedAt?: string; pages_read?: number | string | null; source?: string;
      }
    ) | undefined,
  ) => {
    sessions = [normalizeSession(sessionInput), ...sessions]
      .sort((a, b) => String(b.ended_at).localeCompare(String(a.ended_at)));
    renderSessionHistory(refs.history, sessions, deleteSessionById);
    onSessionsChanged(sessions);
  };

  const deleteSessionById = (sessionId: string) => {
    const session = sessions.find((row) => row.id === sessionId);
    if (!session) {
      return;
    }
    const confirmed = globalThis.confirm(`Delete ${session.minutes} minute session for ${session.title}?`);
    if (!confirmed) {
      return;
    }
    sessions = sessions.filter((row) => row.id !== sessionId);
    renderSessionHistory(refs.history, sessions, deleteSessionById);
    onSessionsChanged(sessions);
    announce("Session deleted.");
  };

  const picker = createPickerController(refs, getBooks);
  picker.bind();

  const timer = createTimerController(refs, picker.selectedBook, commitSession, announce, setStatus);
  const saveManualSession = createManualSessionSaver(
    refs,
    picker.selectedBook,
    commitSession,
    announce,
    setStatus,
  );

  refs.startBtn.onclick = timer.startTimer;
  refs.pauseBtn.onclick = timer.pauseTimer;
  refs.stopBtn.onclick = timer.stopAndPersistTimer;
  refs.manualSaveBtn.onclick = saveManualSession;

  renderSessionHistory(refs.history, sessions, deleteSessionById);
  timer.updateTimerLabel();
  timer.syncTimerButtons();

  return {
    getSessions: () => [...sessions],
    setSessions(nextSessions: Parameters<typeof normalizeSessions>[0]) {
      sessions = normalizeSessions(nextSessions);
      renderSessionHistory(refs.history, sessions, deleteSessionById);
    },
    refreshBooks: picker.refreshPicker,
    selectBookById: picker.selectBookById,
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

export {normalizeSessions} from "./sessions/normalize.js";
