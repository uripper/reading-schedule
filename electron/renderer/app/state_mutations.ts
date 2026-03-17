/**
 * Applies app-runtime mutations by computing next-state snapshots and then
 * synchronizing them back into the shared runtime object.
 */

import type {
    AppDerivedIndexes,
    AppRuntimeState,
    AppStateMutation,
} from "../../types/types.ts";
import {
    bookByIdIndex,
    sessionsByBookIndex,
    sessionsByDayIndex,
    splitCompletionIndexes,
} from "./state_indexes.ts";

type SetLastResultMutation = Extract<
    AppStateMutation,
    { type: "set_last_result" }
>;

type SetScheduleCompletionsMutation = Extract<
    AppStateMutation,
    { type: "set_schedule_completions" }
>;

type SetBlockedDayBooksMutation = Extract<
    AppStateMutation,
    { type: "set_blocked_day_books" }
>;

type SetBlockedDayBookMutation = Extract<
    AppStateMutation,
    { type: "set_blocked_day_book" }
>;

type SetSessionsMutation = Extract<AppStateMutation, { type: "set_sessions" }>;

type SetBookIndexMutation = Extract<
    AppStateMutation,
    { type: "set_book_index" }
>;

/**
 * Applies a runtime-state mutation while preserving the shared state object identity.
 * Derived indexes stay synchronized with the primary state fields they depend on.
 * @param state - Shared runtime state container used across renderer modules.
 * @param mutation - Typed mutation payload.
 */
export function applyAppStateMutation(
    state: AppRuntimeState,
    mutation: AppStateMutation,
): void {
    const NEXT_STATE = nextAppRuntimeState(state, mutation);
    syncAppRuntimeState(state, NEXT_STATE);
}

function nextAppRuntimeState(
    state: Readonly<AppRuntimeState>,
    mutation: AppStateMutation,
): AppRuntimeState {
    switch (mutation.type) {
        case "set_last_result":
            return nextLastResultState(state, mutation);
        case "set_schedule_completions":
            return nextScheduleCompletionsState(state, mutation);
        case "set_blocked_day_books":
            return nextBlockedDayBooksState(state, mutation);
        case "set_blocked_day_book":
            return nextBlockedDayBookState(state, mutation);
        case "set_sessions":
            return nextSessionsState(state, mutation);
        case "set_book_index":
            return nextBookIndexState(state, mutation);
    }
    return assertUnreachableAppStateMutation(mutation);
}

function syncAppRuntimeState(
    state: AppRuntimeState,
    nextState: AppRuntimeState,
): void {
    Object.assign(state, nextState);
}

function withDerivedIndexes(
    state: Readonly<AppRuntimeState>,
    derivedIndexes: Partial<AppDerivedIndexes>,
): AppRuntimeState {
    return {
        ...state,
        derived: {
            ...state.derived,
            ...derivedIndexes,
        },
    };
}

function nextLastResultState(
    state: Readonly<AppRuntimeState>,
    mutation: Readonly<SetLastResultMutation>,
): AppRuntimeState {
    return {
        ...state,
        lastResult: mutation.lastResult,
    };
}

function nextScheduleCompletionsState(
    state: Readonly<AppRuntimeState>,
    mutation: Readonly<SetScheduleCompletionsMutation>,
): AppRuntimeState {
    const SCHEDULE_COMPLETIONS = { ...mutation.scheduleCompletions };
    const COMPLETION_INDEXES = splitCompletionIndexes(SCHEDULE_COMPLETIONS);
    return withDerivedIndexes(
        {
            ...state,
            scheduleCompletions: SCHEDULE_COMPLETIONS,
        },
        COMPLETION_INDEXES,
    );
}

function nextBlockedDayBooksState(
    state: Readonly<AppRuntimeState>,
    mutation: Readonly<SetBlockedDayBooksMutation>,
): AppRuntimeState {
    return {
        ...state,
        blockedDayBooks: { ...mutation.blockedDayBooks },
    };
}

function nextBlockedDayBooks(
    blockedDayBooks: Readonly<AppRuntimeState["blockedDayBooks"]>,
    mutation: Readonly<SetBlockedDayBookMutation>,
): AppRuntimeState["blockedDayBooks"] {
    const NEXT_BLOCKED_DAY_BOOKS = { ...blockedDayBooks };
    if (mutation.blocked) {
        NEXT_BLOCKED_DAY_BOOKS[mutation.key] = true;
        return NEXT_BLOCKED_DAY_BOOKS;
    }
    delete NEXT_BLOCKED_DAY_BOOKS[mutation.key];
    return NEXT_BLOCKED_DAY_BOOKS;
}

function nextBlockedDayBookState(
    state: Readonly<AppRuntimeState>,
    mutation: Readonly<SetBlockedDayBookMutation>,
): AppRuntimeState {
    return {
        ...state,
        blockedDayBooks: nextBlockedDayBooks(state.blockedDayBooks, mutation),
    };
}

function nextSessionsState(
    state: Readonly<AppRuntimeState>,
    mutation: Readonly<SetSessionsMutation>,
): AppRuntimeState {
    const SESSIONS = [...mutation.sessions];
    return withDerivedIndexes(
        {
            ...state,
            sessions: SESSIONS,
        },
        {
            sessionsByBook: sessionsByBookIndex(SESSIONS),
            sessionsByDay: sessionsByDayIndex(SESSIONS),
        },
    );
}

function nextBookIndexState(
    state: Readonly<AppRuntimeState>,
    mutation: Readonly<SetBookIndexMutation>,
): AppRuntimeState {
    return withDerivedIndexes(state, {
        bookById: bookByIdIndex(mutation.books),
    });
}

function assertUnreachableAppStateMutation(mutation: never): never {
    throw new Error(`Unhandled AppStateMutation: ${String(mutation)}`);
}
