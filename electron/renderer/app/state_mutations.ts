import {
    type ApplyAppStateMutation,
    type AppRuntimeState,
    type AppStateMutation,
} from "../../types/types.js";
import {
    bookByIdIndex,
    sessionsByBookIndex,
    sessionsByDayIndex,
    splitCompletionIndexes,
} from "./state_indexes.js";

/**
 * Applies runtime-state mutation operations and keeps derived indexes synchronized.
 * @param state Mutable runtime state container.
 * @param mutation Typed mutation payload.
 */
export function applyAppStateMutation(
    state: AppRuntimeState,
    mutation: AppStateMutation,
): void {
    const MUTABLE_STATE = state;
    switch (mutation.type) {
        case "set_last_result": {
            MUTABLE_STATE.lastResult = mutation.lastResult;
            return;
        }
        case "set_schedule_completions": {
            MUTABLE_STATE.scheduleCompletions = {
                ...mutation.scheduleCompletions,
            };
            const SPLIT = splitCompletionIndexes(
                MUTABLE_STATE.scheduleCompletions,
            );
            MUTABLE_STATE.derived.completionBySessionKey =
                SPLIT.completionBySessionKey;
            MUTABLE_STATE.derived.completionByDayBookKey =
                SPLIT.completionByDayBookKey;
            return;
        }
        case "set_blocked_day_books": {
            MUTABLE_STATE.blockedDayBooks = { ...mutation.blockedDayBooks };
            return;
        }
        case "set_blocked_day_book": {
            const NEXT_BLOCKED = { ...MUTABLE_STATE.blockedDayBooks };
            if (mutation.blocked) {
                NEXT_BLOCKED[mutation.key] = true;
            } else {
                delete NEXT_BLOCKED[mutation.key];
            }
            MUTABLE_STATE.blockedDayBooks = NEXT_BLOCKED;
            return;
        }
        case "set_sessions": {
            MUTABLE_STATE.sessions = [...mutation.sessions];
            MUTABLE_STATE.derived.sessionsByDay = sessionsByDayIndex(
                MUTABLE_STATE.sessions,
            );
            MUTABLE_STATE.derived.sessionsByBook = sessionsByBookIndex(
                MUTABLE_STATE.sessions,
            );
            return;
        }
        case "set_book_index": {
            MUTABLE_STATE.derived.bookById = bookByIdIndex(mutation.books);
            return;
        }
    }
}
