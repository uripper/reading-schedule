import {
    type FocusSession,
    type PlannerScheduleRow,
    type TodayFocusState,
} from "../../../types/types.js";

export const TINY_START_MINUTES = 3;

const NO_SESSION_START_FEEDBACK = "No upcoming session to start right now.";

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
 * Applies Tiny Start completion feedback and clears started state.
 * @param state Current focus-mode state.
 * @param tinyStartMinutes Tiny-start duration in minutes.
 * @returns Updated focus state after tiny-start completion.
 */
export function completeTinyStart(
    state: TodayFocusState,
    tinyStartMinutes = TINY_START_MINUTES,
): TodayFocusState {
    const NORMALIZED_MINUTES = Math.max(
        1,
        Math.round(Number(tinyStartMinutes || 0)),
    );
    return {
        ...state,
        feedback: `Tiny Start complete: ${NORMALIZED_MINUTES} minutes done.`,
        isStarted: false,
    };
}
