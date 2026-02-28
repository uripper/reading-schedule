import type {
    FocusSession,
    PlannerScheduleRow,
    TodayFocusState,
} from "../../../types/types.js";

export const TINY_START_MINUTES = 3;

const NO_SESSION_START_FEEDBACK = "No upcoming session to start right now.";

/**
 * Converts a planned row into focus-session display metadata.
 * @param row Planned schedule row.
 * @returns Normalized focus session, or null when row is missing.
 */
export function focusSessionFromRow(
    row: PlannerScheduleRow | null,
): FocusSession | null {
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

/**
 * Creates the default closed focus-mode state.
 * @returns Initial focus-state object.
 */
export function createClosedFocusState(): TodayFocusState {
    return {
        feedback: "",
        isOpen: false,
        isStarted: false,
        session: null,
    };
}

/**
 * Opens focus mode with an optional scheduled session context.
 * @param session Focus session selected from schedule metadata.
 * @returns Open, not-started focus state.
 */
export function openFocusMode(session: FocusSession | null): TodayFocusState {
    return {
        feedback: "",
        isOpen: true,
        isStarted: false,
        session,
    };
}

/**
 * Transitions focus state to "started" when a session is available.
 * @param state Current focus-mode state.
 * @returns Updated focus state with feedback message.
 */
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

/**
 * Marks the current focus session complete in UI state.
 * @param state Current focus-mode state.
 * @returns Updated focus state with completion feedback.
 */
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

/**
 * Applies Tiny Start completion feedback and clears started state.
 * @param state Current focus-mode state.
 * @param tinyStartMinutes Tiny-start duration in minutes.
 * @returns Updated focus state after tiny-start completion.
 */
export function completeTinyStart(
    state: TodayFocusState,
    tinyStartMinutes = TINY_START_MINUTES,
): TodayFocusState {
    const normalizedMinutes = Math.max(
        1,
        Math.round(Number(tinyStartMinutes || 0)),
    );
    return {
        ...state,
        feedback: `Tiny Start complete: ${normalizedMinutes} minutes done.`,
        isStarted: false,
    };
}

/**
 * Exits focus mode and resets transient focus feedback flags.
 * @param state Current focus-mode state.
 * @returns Closed focus state preserving no active session state.
 */
export function exitFocusMode(state: TodayFocusState): TodayFocusState {
    return {
        ...state,
        feedback: "",
        isOpen: false,
        isStarted: false,
    };
}
