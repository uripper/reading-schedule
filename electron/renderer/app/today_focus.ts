import type { PlannerScheduleRow } from "./types.js";

export const TINY_START_MINUTES = 3;

export type FocusSession = {
  bookId: string;
  date: string;
  minutes: number;
  sessionIndex: number | null;
  title: string;
};

export type TodayFocusState = {
  feedback: string;
  isOpen: boolean;
  isStarted: boolean;
  session: FocusSession | null;
};

const NO_SESSION_START_FEEDBACK = "No upcoming session to start right now.";

export function focusSessionFromRow(row: PlannerScheduleRow | null): FocusSession | null {
  if (!row) {
    return null;
  }
  return {
    bookId: String(row.book_id || ""),
    date: String(row.date || ""),
    minutes: Math.max(1, Math.round(Number(row.minutes || 0))),
    sessionIndex: Math.max(1, Math.round(Number(row.session_index || 1))),
    title: String(row.title || "Untitled"),
  };
}

export function createClosedFocusState(): TodayFocusState {
  return {
    feedback: "",
    isOpen: false,
    isStarted: false,
    session: null,
  };
}

export function openFocusMode(session: FocusSession | null): TodayFocusState {
  return {
    feedback: "",
    isOpen: true,
    isStarted: false,
    session,
  };
}

export function startFocusSession(state: TodayFocusState): TodayFocusState {
  if (!state.session) {
    return {
      ...state,
      feedback: NO_SESSION_START_FEEDBACK,
      isStarted: false,
    };
  }
  return {
    ...state,
    feedback: `Started "${state.session.title}" for ${state.session.minutes} minutes.`,
    isStarted: true,
  };
}

export function completeFocusSession(state: TodayFocusState): TodayFocusState {
  if (!state.session) {
    return {
      ...state,
      feedback: "No active focus session to complete.",
      isStarted: false,
    };
  }
  return {
    ...state,
    feedback: `Completed "${state.session.title}".`,
    isStarted: false,
  };
}

export function completeTinyStart(
  state: TodayFocusState,
  tinyStartMinutes = TINY_START_MINUTES,
): TodayFocusState {
  const normalizedMinutes = Math.max(1, Math.round(Number(tinyStartMinutes || 0)));
  return {
    ...state,
    feedback: `Tiny Start complete: ${normalizedMinutes} minutes done.`,
    isStarted: false,
  };
}

export function exitFocusMode(state: TodayFocusState): TodayFocusState {
  return {
    ...state,
    feedback: "",
    isOpen: false,
    isStarted: false,
  };
}
