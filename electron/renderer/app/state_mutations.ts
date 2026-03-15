import type { AppRuntimeState, AppStateMutation } from "../../types/types.ts";
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
 * Applies runtime-state mutation operations and keeps derived indexes synchronized.
 * @param state - Mutable runtime state container.
 * @param mutation - Typed mutation payload.
 */
export function applyAppStateMutation(
    state: AppRuntimeState,
    mutation: AppStateMutation,
): void {
    switch (mutation.type) {
        case "set_last_result": return setLastResult(state, mutation);
        case "set_schedule_completions": return setScheduleCompletions(state, mutation);
        case "set_blocked_day_books": return setBlockedDays(state, mutation);
        case "set_blocked_day_book": return setBlockedDay(state, mutation);
        case "set_sessions": return setSessions(state, mutation);
        case "set_book_index": return setBookIndex(state, mutation);
    }

    // Explicit exhaustive-check to catch unhandled AppStateMutation variants.
    const _exhaustiveCheck: never = mutation;
    throw new Error(`Unhandled AppStateMutation type: ${(_exhaustiveCheck as AppStateMutation).type}`);
}

function setLastResult(
    state: AppRuntimeState,
    mutation: SetLastResultMutation,
): void {
    state.lastResult = mutation.lastResult;
}

function setScheduleCompletions(
    state: AppRuntimeState,
    mutation: SetScheduleCompletionsMutation,
): void {
    state.scheduleCompletions = { ...mutation.scheduleCompletions };
    const split = splitCompletionIndexes(state.scheduleCompletions);
    state.derived.completionBySessionKey = split.completionBySessionKey;
    state.derived.completionByDayBookKey = split.completionByDayBookKey;
}

function setBlockedDays(
    state: AppRuntimeState,
    mutation: SetBlockedDayBooksMutation,
): void {
    state.blockedDayBooks = { ...mutation.blockedDayBooks };
}

function setBlockedDay(
    state: AppRuntimeState,
    mutation: SetBlockedDayBookMutation,
): void {
    const nextBlocked = { ...state.blockedDayBooks };
    if (mutation.blocked) {
        nextBlocked[mutation.key] = true;
    } else {
        delete nextBlocked[mutation.key];
    }
    state.blockedDayBooks = nextBlocked;
}

function setSessions(
    state: AppRuntimeState,
    mutation: SetSessionsMutation,
): void {
    state.sessions = [...mutation.sessions];
    state.derived.sessionsByDay = sessionsByDayIndex(state.sessions);
    state.derived.sessionsByBook = sessionsByBookIndex(state.sessions);
}

function setBookIndex(
    state: AppRuntimeState,
    mutation: SetBookIndexMutation,
): void {
    state.derived.bookById = bookByIdIndex(mutation.books);
}